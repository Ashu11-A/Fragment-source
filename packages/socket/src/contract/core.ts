import { z } from 'zod'
import { defineEvent } from '../types/index.js'

// ─── Server → Core events ───────────────────────────────────────────────────
// Events that the SERVER sends TO the CORE bot process.

export const coreServerToClient = {
  /**
   * Server → core: run a plugin management action.
   * Core must respond with `core:plugin:result`.
   */
  'core:plugin:request': defineEvent(z.discriminatedUnion('action', [
    z.object({
      requestId: z.string().min(1).max(128),
      action: z.literal('list'),
    }),
    z.object({
      requestId: z.string().min(1).max(128),
      action: z.literal('reload'),
      filePath: z.string().min(1).max(4096),
    }),
    z.object({
      requestId: z.string().min(1).max(128),
      action: z.literal('unload'),
      pluginName: z.string().min(1).max(256),
    }),
    z.object({
      requestId: z.string().min(1).max(128),
      action: z.literal('load'),
      filePath: z.string().min(1).max(4096),
    }),
  ])),

  /**
   * Server → core: result of a license acceptance request (accepted or rejected by user).
   * NOTE: This was incorrectly placed in clientToServer in the previous version.
   */
  'bot:license:result': defineEvent(z.object({
    botId: z.number().int().positive(),
    accepted: z.boolean(),
  })),

  /** Notifies a plugin was installed/loaded on the server */
  'plugin:installed': defineEvent(z.object({
    name: z.string(),
    version: z.string().optional(),
  })),

  /** Notifies a plugin was removed/unloaded */
  'plugin:uninstalled': defineEvent(z.object({
    name: z.string(),
  })),

  /** Server → core: configure the Discord token */
  'config:discordToken': defineEvent(z.object({
    token: z.string().min(1),
  })),

  /** Server → core: configure the bot ID */
  'config:botId': defineEvent(z.object({
    botId: z.number().int().positive(),
  })),

  /** Server → core: push live environment variables to the running process */
  'config:envVars': defineEvent(z.object({
    envs: z.array(z.object({
      name: z.string().min(1).max(256),
      value: z.string().max(10000),
    })),
  })),
} as const

// ─── Core → Server events ───────────────────────────────────────────────────
// Events that the CORE bot process sends TO the SERVER.

export const coreClientToServer = {
  /** Client identifies itself after connection */
  'client:identify': defineEvent(z.object({
    botId: z.number().int(),
    version: z.string().optional(),
  })),

  /** Report plugin health from the core side */
  'plugin:health': defineEvent(z.object({
    name: z.string(),
    healthy: z.boolean(),
    error: z.string().optional(),
  })),

  /** Send a custom message to the server */
  'client:message': defineEvent(z.object({
    channel: z.string(),
    payload: z.unknown(),
  })),

  /**
   * Core → server: structured activity / log line (persisted + broadcast to dashboard watchers).
   * Requires prior `client:identify` so the server knows `botId`.
   */
  'core:activity:report': defineEvent(z.object({
    level: z.enum(['trace', 'debug', 'info', 'warn', 'error']),
    category: z.string().min(1).max(64),
    message: z.string().min(1).max(4096),
    /** Dashboard filter tone; server normalizes if omitted */
    display: z.enum(['success', 'info', 'error']).optional(),
    metadata: z.record(z.unknown()).optional(),
    source: z.string().max(128).optional(),
    correlationId: z.string().max(64).optional(),
  })),

  /** Core → server: batched stdout/stderr lines (plain text) */
  'core:console:push': defineEvent(z.object({
    lines: z.array(z.string().max(32768)).min(1).max(150),
  })),

  /** Core → server: push runtime telemetry sampled locally by the core process */
  'core:runtime:report': defineEvent(z.object({
    cpuUsagePercent: z.number().nonnegative().optional(),
    memoryUsageMb: z.number().nonnegative().optional(),
    activePlugins: z.number().int().nonnegative().optional(),
  })),

  /**
   * Core → server: result of `core:plugin:request`.
   * Server correlates with `requestId` and completes the tRPC bridge.
   */
  'core:plugin:result': defineEvent(z.object({
    requestId: z.string().min(1).max(128),
    ok: z.boolean(),
    action: z.enum(['list', 'reload', 'unload', 'load']),
    message: z.string().optional(),
    details: z.string().optional(),
    plugins: z.array(z.object({
      pluginName: z.string(),
      filePath: z.string(),
      version: z.string().optional(),
      description: z.string().nullable().optional(),
      loaded: z.boolean(),
    })).optional(),
    pluginName: z.string().optional(),
    filePath: z.string().optional(),
  })),

  /**
   * Core → server: request user acceptance of the software license.
   * Server forwards to the bot owner's dashboard session (queued if offline).
   */
  'core:license:request': defineEvent(z.object({
    botId: z.number().int().positive(),
    licenseText: z.string().min(1),
    language: z.string().min(1).max(16),
    version: z.string().min(1).max(64),
  })),
} as const

// ─── Core namespace contract ─────────────────────────────────────────────────

export type CoreServerToClient = typeof coreServerToClient
export type CoreClientToServer = typeof coreClientToServer
