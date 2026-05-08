import semver from 'semver'
import type { FastifyInstance } from 'fastify'
import { Bot } from '@/database/entity/Bot.js'
import { Variable } from '@/database/entity/Variable.js'
import { PluginRelease } from '@/database/entity/PluginRelease.js'
import { Release } from '@/database/entity/Release.js'
import { RequestStatus } from '@/database/enums.js'
import { hasDiscordToken } from '@/security/discordTokenCipher.js'
import { issueContainerSession } from '@/security/containerSession.js'
import { billing } from '@/services/Billing.js'
import { storage, baseUrl } from '@/singletons.js'
import { getCoreIo } from '@/socket/namespaces/index.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RuntimeTelemetryState = {
  cpuUsagePercent: number | null
  memoryUsageMb: number | null
  activePlugins: number | null
  updatedAt: string
}

export type BotRuntimeStatsPayload = {
  botId: number
  online: boolean
  activePlugins: number
  cpuUsagePercent: number | null
  memoryUsageMb: number | null
  memoryLimitMb: number | null
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Console buffer (kept as inner class)
// ---------------------------------------------------------------------------

const MAX_LINES = 6000

class ConsoleBuffer {
  private readonly buffers = new Map<number, string[]>()

  append(botId: number, lines: string[]): void {
    if (lines.length === 0) return
    let buf = this.buffers.get(botId)
    if (!buf) {
      buf = []
      this.buffers.set(botId, buf)
    }
    for (const line of lines) buf.push(line)
    if (buf.length > MAX_LINES) buf.splice(0, buf.length - MAX_LINES)
  }

  snapshot(botId: number, tail: number): string[] {
    const buf = this.buffers.get(botId)
    if (!buf || buf.length === 0) return []
    const n = Math.min(tail, buf.length)
    return buf.slice(buf.length - n)
  }

  clear(botId: number): void {
    this.buffers.delete(botId)
  }
}

// ---------------------------------------------------------------------------
// BotRuntime
// ---------------------------------------------------------------------------

export class BotRuntime {
  readonly console = new ConsoleBuffer()
  private readonly telemetry = new Map<number, RuntimeTelemetryState>()
  private static readonly BUNDLE = 'core.js'

  // --- Container helpers ---

  containerName(botId: number, nodeId: number): string {
    return `fragment-bot-${botId}-node-${nodeId}`
  }

  waitCommand(): string {
    return `while [ -z "$DISCORD_TOKEN" ]; do echo "Waiting for Discord token..."; sleep 2; done && bun ${BotRuntime.BUNDLE}`
  }

  starterFiles(botId: number, releaseBuffer?: Buffer) {
    if (releaseBuffer) {
      return [{ path: BotRuntime.BUNDLE, contentBase64: releaseBuffer.toString('base64') }]
    }
    return [{
      path: BotRuntime.BUNDLE,
      contentBase64: this.toBase64([
        'const token = process.env.DISCORD_TOKEN?.trim() || ""',
        'if (!token) throw new Error("Discord token is not configured")',
        `console.log('Fragment bot ${botId} container is ready — no release bundle uploaded')`,
        'setInterval(() => {}, 2 ** 31 - 1)',
        '',
      ].join('\n')),
    }]
  }

  get bundleFilename(): string {
    return BotRuntime.BUNDLE
  }

  assertToken(token: string): string {
    const trimmed = token.trim()
    if (trimmed.length < 24 || trimmed.length > 4096 || /\s/.test(trimmed)) {
      throw new Error('Discord token format is invalid.')
    }
    return trimmed
  }

  // --- Env vars ---

  static envPrefix(pluginName: string): string {
    return pluginName.replace(/^plugin-/, '').replace(/[-\s]+/g, '_').toUpperCase()
  }

  static envVarName(pluginName: string, varName: string): string {
    return `${BotRuntime.envPrefix(pluginName)}_${varName}`
  }

  async collectEnvVars(botId: number): Promise<string[]> {
    const variables = await Variable.find({
      where: { bot: { id: botId } },
      relations: { plugin: true },
    })
    return variables.map((v) => `${BotRuntime.envVarName(v.plugin.name, v.name)}=${v.value}`)
  }

  async collectDefaultEnvVars(botId: number): Promise<string[]> {
    const bot = await Bot.findOne({ where: { id: botId }, relations: { plugins: true } })
    if (!bot) return []

    const envs: string[] = []
    for (const plugin of bot.plugins) {
      const release = await PluginRelease.findOne({
        where: { plugin: { id: plugin.id }, status: RequestStatus.Approved },
        order: { createdAt: 'DESC' },
      })
      if (!release?.envs) continue
      for (const def of release.envs) {
        if (def.default !== undefined) {
          envs.push(`${BotRuntime.envVarName(plugin.name, def.name)}=${def.default}`)
        }
      }
    }
    return envs
  }

  async collectAllEnvVars(botId: number): Promise<string[]> {
    const userSet = await this.collectEnvVars(botId)
    const defaults = await this.collectDefaultEnvVars(botId)
    const userSetKeys = new Set(userSet.map((kv) => kv.split('=')[0]))
    return [...userSet, ...defaults.filter((kv) => !userSetKeys.has(kv.split('=')[0]))]
  }

  pushEnvVarsToCore(botId: number, envs: Array<{ name: string; value: string }>): void {
    try {
      const io = getCoreIo()
      io.to(`bot:${botId}`).emit('config:envVars', { envs })
    } catch {
      // core socket not initialised or bot offline — skip silently
    }
  }

  parseEnvKv(kvStrings: string[]): Array<{ name: string; value: string }> {
    return kvStrings.map((kv) => {
      const idx = kv.indexOf('=')
      return { name: kv.slice(0, idx), value: kv.slice(idx + 1) }
    })
  }

  // --- Telemetry ---

  private normalizeNonNeg(value: number | null | undefined): number | null {
    if (value == null || Number.isNaN(value)) return null
    return value < 0 ? 0 : value
  }

  private normalizeIntNonNeg(value: number | null | undefined): number | null {
    if (value == null || Number.isNaN(value)) return null
    return Math.max(0, Math.round(value))
  }

  upsertTelemetry(botId: number, input: {
    cpuUsagePercent?: number
    memoryUsageMb?: number
    activePlugins?: number
  }): void {
    const prev = this.telemetry.get(botId)
    this.telemetry.set(botId, {
      cpuUsagePercent: input.cpuUsagePercent !== undefined
        ? this.normalizeNonNeg(input.cpuUsagePercent)
        : prev?.cpuUsagePercent ?? null,
      memoryUsageMb: input.memoryUsageMb !== undefined
        ? this.normalizeNonNeg(input.memoryUsageMb)
        : prev?.memoryUsageMb ?? null,
      activePlugins: input.activePlugins !== undefined
        ? this.normalizeIntNonNeg(input.activePlugins)
        : prev?.activePlugins ?? null,
      updatedAt: new Date().toISOString(),
    })
  }

  private isBotOnline(fastify: FastifyInstance, botId: number): boolean {
    const room = fastify.io.of('/core').adapter.rooms.get(`bot:${botId}`)
    return (room?.size ?? 0) > 0
  }

  async getStats(fastify: FastifyInstance, botId: number): Promise<BotRuntimeStatsPayload | null> {
    const bot = await Bot.findOne({ where: { id: botId }, relations: { plugins: true, user: true } })
    if (!bot) return null

    const state = this.telemetry.get(botId)
    const { plan } = await billing.effectivePlan(bot.user.id)
    return {
      botId,
      online: this.isBotOnline(fastify, botId),
      activePlugins: state?.activePlugins ?? bot.plugins.length,
      cpuUsagePercent: state?.cpuUsagePercent ?? null,
      memoryUsageMb: state?.memoryUsageMb ?? null,
      memoryLimitMb: plan.memory ?? null,
      updatedAt: state?.updatedAt ?? bot.updatedAt.toISOString(),
    }
  }

  async emitStats(fastify: FastifyInstance, botId: number): Promise<void> {
    const payload = await this.getStats(fastify, botId)
    if (!payload) return
    fastify.io.to(`bot:${botId}:runtime`).emit('bot:runtime:stats', payload)
  }

  // --- Auto-update ---

  private async checkPluginCompat(
    botId: number,
    plugins: Array<{ id: number; name: string }>,
    coreVersion: string,
  ): Promise<{ compatible: true } | { compatible: false; blockers: string[] }> {
    const blockers: string[] = []
    for (const plugin of plugins) {
      const latest = await PluginRelease.findOne({
        where: { plugin: { id: plugin.id }, status: RequestStatus.Approved },
        order: { createdAt: 'DESC' },
      })
      if (!latest) continue
      if (!semver.valid(coreVersion) || !semver.validRange(latest.minReleaseVersion)) continue
      if (!semver.satisfies(coreVersion, latest.minReleaseVersion)) {
        blockers.push(`${plugin.name}@${latest.version} requires core ${latest.minReleaseVersion}`)
      }
    }
    return blockers.length === 0 ? { compatible: true } : { compatible: false, blockers }
  }

  async triggerAutoUpdate(release: Release, log: FastifyInstance['log']): Promise<void> {
    // Lazy-import to avoid circular dependency at module load time
    const { nodeBridge } = await import('@/services/NodeBridge.js')

    log.info({ releaseId: release.id, version: release.version }, '[autoUpdate] Starting')

    const releaseWithFile = release.file
      ? release
      : await Release.findOne({ where: { id: release.id }, relations: { file: true } })

    if (!releaseWithFile?.file) {
      log.warn({ releaseId: release.id }, '[autoUpdate] Release has no file — skipping')
      return
    }

    const releaseBuffer = await storage.load(releaseWithFile.file.sha256)
    if (!releaseBuffer) {
      log.warn({ releaseId: release.id }, '[autoUpdate] Bundle not found in storage — skipping')
      return
    }

    const bots = await Bot.find({
      where: { enabled: true },
      relations: {
        plugins: true,
        node: true,
        user: true,
        release: true,
      },
    })

    let updated = 0
    let skipped = 0

    for (const bot of bots) {
      if (bot.release?.id === release.id) continue

      const compat = await this.checkPluginCompat(bot.id, bot.plugins, release.version)
      if (!compat.compatible) {
        log.info(
          { botId: bot.id, blockers: compat.blockers },
          '[autoUpdate] Skipping — incompatible plugins',
        )
        skipped++
        continue
      }

      const { accessToken: fragmentAccessToken, refreshToken: fragmentRefreshToken } =
        await issueContainerSession(bot.user, bot.id)

      const envs = [
        `FRAGMENT_BOT_ID=${bot.id}`,
        `FRAGMENT_LANGUAGE=${bot.user.language}`,
        `SERVER_URL=${baseUrl}`,
        `FRAGMENT_ACCESS_TOKEN=${fragmentAccessToken}`,
        `FRAGMENT_REFRESH_TOKEN=${fragmentRefreshToken}`,
        ...(bot.envs?.map((v) => `${v.name}=${v.value}`) ?? []),
        ...await this.collectEnvVars(bot.id),
        ...await this.collectDefaultEnvVars(bot.id),
      ]

      let nodeSuccesses = 0
      const node = bot.node
      const tokenFetchUrl = hasDiscordToken(bot)
        ? `${baseUrl}/api/node/${node.id}/bots/${bot.id}/token?token=${encodeURIComponent(node.token)}`
        : undefined
      try {
        const { plan } = await billing.effectivePlan(bot.user.id)
        await nodeBridge.create(log, node.id, {
          action: 'create',
          botId: bot.id,
          name: this.containerName(bot.id, node.id),
          startCommand: tokenFetchUrl ? `bun ${BotRuntime.BUNDLE}` : this.waitCommand(),
          tokenFetchUrl,
          files: this.starterFiles(bot.id, releaseBuffer),
          envs,
          memoryLimitMb: plan.memory ?? undefined,
        })
        nodeSuccesses++
        log.info(
          { botId: bot.id, nodeId: node.id, version: release.version },
          '[autoUpdate] Container updated',
        )
      } catch (error) {
        log.error(
          {
            botId: bot.id,
            nodeId: node.id,
            error: error instanceof Error ? error.message : String(error),
          },
          '[autoUpdate] Failed to update container — will retry on next release promotion',
        )
      }

      if (nodeSuccesses > 0) {
        bot.release = release
        await bot.save()
        updated++
      }
    }

    log.info(
      { releaseId: release.id, version: release.version, updated, skipped },
      '[autoUpdate] Done',
    )
  }

  // --- Private helpers ---

  private toBase64(content: string): string {
    return Buffer.from(content, 'utf8').toString('base64')
  }
}

export const botRuntime = new BotRuntime()
