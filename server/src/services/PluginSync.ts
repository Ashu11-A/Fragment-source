import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { PluginRelease } from '@/database/entity/PluginRelease.js'
import { IsNull } from 'typeorm'

const envVarSchema = z.object({
  name: z.string(),
  description: z.string(),
  required: z.boolean().optional(),
  default: z.string().optional(),
  type: z.enum(['string', 'number', 'boolean', 'secret']).optional(),
})

const metadataSchema = z.object({
  plugins: z.array(z.object({
    sha256: z.string(),
    manifest: z.object({
      envs: z.array(envVarSchema),
    }).optional(),
  })),
})

/**
 * Reads releases/metadata.json (monorepo root) and backfills PluginRelease.envs
 * for any release whose envs column is NULL, matching by bundle sha256.
 * Silent no-op when metadata.json is absent (production containers).
 */
export class PluginSync {
  async syncFromMetadata(metadataDir: string): Promise<void> {
    const metadataPath = join(metadataDir, 'releases', 'metadata.json')
    if (!existsSync(metadataPath)) return

    let parsed: z.infer<typeof metadataSchema>
    try {
      const raw = readFileSync(metadataPath, { encoding: 'utf-8' })
      parsed = metadataSchema.parse(JSON.parse(raw))
    } catch {
      return
    }

    // Build sha256 → envs map from metadata.json (skip plugins with no envs)
    const envsByHash = new Map<string, z.infer<typeof envVarSchema>[]>()
    for (const plugin of parsed.plugins) {
      const envs = plugin.manifest?.envs
      if (envs && envs.length > 0) {
        envsByHash.set(plugin.sha256, envs)
      }
    }

    if (envsByHash.size === 0) return

    // Find all releases with null envs that have a stored file
    const releases = await PluginRelease.find({
      where: { envs: IsNull() },
      relations: { file: true },
    })

    let updated = 0
    for (const release of releases) {
      if (!release.file?.sha256) continue
      const envs = envsByHash.get(release.file.sha256)
      if (!envs) continue
      release.envs = envs
      await release.save()
      updated++
    }

    if (updated > 0) {
      console.log(`[syncPluginReleaseEnvs] Backfilled envs for ${updated} release(s) from metadata.json`)
    }
  }
}

export const pluginSync = new PluginSync()
