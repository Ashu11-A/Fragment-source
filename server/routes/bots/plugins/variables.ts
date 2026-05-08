import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { protectedProcedure } from '@/trpc.js'
import { Variable } from '@/database/entity/Variable.js'
import { PluginRelease } from '@/database/entity/PluginRelease.js'
import { RequestStatus } from '@/database/enums.js'
import { botRuntime } from '@/services/BotRuntime.js'
import { nodeBridge } from '@/services/NodeBridge.js'
import { baseUrl } from '@/singletons.js'
import { toTrpcError } from '../../_shared/errors.js'
import { findBotForUser } from '../shared.js'
import { Node } from '@/database/entity/Node.js'
import { Bot } from '@/database/entity/Bot.js'

const getVariablesSchema = z.object({
  botId: z.number().int().positive(),
  pluginId: z.number().int().positive(),
})

const setVariablesSchema = z.object({
  botId: z.number().int().positive(),
  pluginId: z.number().int().positive(),
  variables: z.array(z.object({
    name: z.string().min(1).max(256),
    value: z.string().max(10000),
  })).max(100),
})

export const getVariablesProcedure = protectedProcedure
  .input(getVariablesSchema)
  .query(async ({ input, ctx }) => {
    try {
      const bot = await findBotForUser(input.botId, ctx.user, ['plugins', 'pluginVariables'])
      const plugin = bot.plugins.find((p) => p.id === input.pluginId)

      if (!plugin) throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Plugin not assigned to this bot.',
      })

      const release = await PluginRelease.findOne({
        where: {
          plugin: { id: plugin.id },
          status: RequestStatus.Approved,
        },
        order: { createdAt: 'DESC' },
      })

      const definitions = release?.envs ?? []

      const values = await Variable.find({
        where: { bot: { id: bot.id }, plugin: { id: plugin.id } },
      })

      const valueMap = new Map(values.map((v) => [v.name, v.value]))

      return {
        definitions,
        variables: values.map((v) => ({ name: v.name, value: v.value })),
        defaults: definitions
          .filter((d) => d.default !== undefined && !valueMap.has(d.name))
          .map((d) => ({ name: d.name, value: d.default! })),
      }
    } catch (error) {
      throw toTrpcError(error, 'Could not get bot plugin variables')
    }
  })

export const setVariablesProcedure = protectedProcedure
  .input(setVariablesSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const bot = await findBotForUser(input.botId, ctx.user, ['plugins', 'pluginVariables'])
      const plugin = bot.plugins.find((p) => p.id === input.pluginId)

      if (!plugin) throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Plugin not assigned to this bot.',
      })

      const release = await PluginRelease.findOne({
        where: {
          plugin: { id: plugin.id },
          status: RequestStatus.Approved,
        },
        order: { createdAt: 'DESC' },
      })

      const definitions = release?.envs ?? []
      const definedNames = new Set(definitions.map((d) => d.name))

      const existing = await Variable.find({
        where: { bot: { id: bot.id }, plugin: { id: plugin.id } },
      })

      const existingMap = new Map(existing.map((v) => [v.name, v]))
      const incomingNames = new Set(input.variables.map((v) => v.name))

      // Delete variables that are no longer present (user-defined only)
      for (const [name, variable] of existingMap) {
        if (!incomingNames.has(name) && !definedNames.has(name)) {
          await variable.remove()
        }
      }

      // Upsert incoming variables
      for (const { name, value } of input.variables) {
        const variable = existingMap.get(name)
        if (variable) {
          variable.value = value
          await variable.save()
        } else {
          await Variable.create({
            name,
            value,
            bot: { id: bot.id },
            plugin: { id: plugin.id },
          }).save()
        }
      }

      // Deduplicated: user-set values take priority over manifest defaults.
      const pluginKvStrings = await botRuntime.collectAllEnvVars(bot.id)
      ctx.req.log.info({ botId: bot.id, pluginKvStrings }, '[bots.plugins.variables] collected plugin env vars')

      // Push to the running core process in real time via socket (no restart needed)
      botRuntime.pushEnvVarsToCore(bot.id, botRuntime.parseEnvKv(pluginKvStrings))

      // Fetch full bot with nodes (including node token) and user (for FRAGMENT_LANGUAGE)
      const fullBot = await Bot.findOne({
        where: { id: bot.id },
        relations: { node: true, user: true },
      })

      if (!fullBot?.node) return { success: true }

      // Build the complete env var set that the daemon stores and recreates the container with
      const containerEnvVars = [
        `FRAGMENT_LANGUAGE=${fullBot.user?.language ?? 'pt-BR'}`,
        ...(fullBot.envs?.map((v) => `${v.name}=${v.value}`) ?? []),
        ...pluginKvStrings,
      ]
      ctx.req.log.info({ botId: bot.id, containerEnvVars }, '[bots.plugins.variables] sending containerEnvVars to daemon')

      const nodeEntity = await Node.findOne({ where: { id: fullBot.node.id } })
      if (!nodeEntity) return { success: true }

      const containerName = botRuntime.containerName(bot.id, nodeEntity.id)
      const tokenFetchUrl = `${baseUrl}/api/node/${nodeEntity.id}/bots/${bot.id}/token?token=${encodeURIComponent(nodeEntity.token)}`

      try {
        await nodeBridge.updateEnv(ctx.req.log, nodeEntity.id, {
          botId: bot.id,
          containerName,
          envVars: containerEnvVars,
          tokenFetchUrl,
        })
      } catch (error) {
        ctx.req.log.warn({
          botId: bot.id,
          nodeId: nodeEntity.id,
          error: error instanceof Error ? error.message : String(error),
        }, '[bots.plugins.variables] daemon env update failed')
      }

      return { success: true }
    } catch (error) {
      throw toTrpcError(error, 'Could not set bot plugin variables')
    }
  })
