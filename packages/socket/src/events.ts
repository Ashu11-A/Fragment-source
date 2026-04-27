import { z } from 'zod'
import { defineEvent, type SocketContract } from './types/index.js'

// ─── Server → Client events ─────────────────────────────────────────────────
// Events that the SERVER sends TO the CLIENT (core)

export const serverToClientEvents = {
  /** Notifies a plugin was installed/loaded on the server */
  'plugin:installed': defineEvent(z.object({
    name: z.string(),
    version: z.string().optional(),
  })),

  /** Notifies a plugin was removed/unloaded */
  'plugin:uninstalled': defineEvent(z.object({
    name: z.string(),
  })),

  /** Server status update */
  'server:status': defineEvent(z.object({
    status: z.enum(['online', 'maintenance', 'shutting-down']),
    connectedClients: z.number().int().nonnegative(),
    uptime: z.number().nonnegative(),
  })),

  /** Broadcast a message to all connected clients */
  'server:broadcast': defineEvent(z.object({
    channel: z.string(),
    payload: z.unknown(),
    timestamp: z.number(),
  })),

  /** Acknowledge a client action */
  'ack': defineEvent(z.object({
    requestId: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
  })),

  /** Batched plain-text console lines from the core process (`bot:{id}:console`) */
  'bot:console:lines': defineEvent(z.object({
    lines: z.array(z.string().max(32768)),
    /** `snapshot` = last buffer after subscribe; `append` = live stream */
    mode: z.enum(['append', 'snapshot']),
  })),

  /** New persisted activity row for a bot (sent to sockets in `bot:{id}:activity`) */
  'bot:activity': defineEvent(z.object({
    id: z.number().int(),
    botId: z.number().int(),
    level: z.string(),
    category: z.string(),
    message: z.string(),
    display: z.enum(['success', 'info', 'error']),
    metadata: z.record(z.unknown()).nullable().optional(),
    source: z.string().nullable().optional(),
    correlationId: z.string().nullable().optional(),
    createdAt: z.string(),
  })),

  /**
   * Server → core: run a plugin management action (core must `emit` {@link clientToServerEvents.core:plugin:result}).
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
} as const

// ─── Client → Server events ─────────────────────────────────────────────────
// Events that the CLIENT (core) sends TO the SERVER

export const clientToServerEvents = {
  /** Ping for health check */
  'ping': defineEvent(z.void()),

  /** Client identifies itself after connection */
  'client:identify': defineEvent(z.object({
    botId: z.number().int(),
    version: z.string().optional(),
  })),

  /** Request the current server status */
  'server:status:request': defineEvent(z.void()),

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

  /** Dashboard → server: subscribe to real-time activity for a bot (ownership checked) */
  'dashboard:activity:subscribe': defineEvent(z.object({
    botId: z.number().int().positive(),
  })),

  /** Dashboard → server: leave the activity stream for a bot */
  'dashboard:activity:unsubscribe': defineEvent(z.object({
    botId: z.number().int().positive(),
  })),

  /** Core → server: batched stdout/stderr lines (plain text, already stripped of ANSI where applicable) */
  'core:console:push': defineEvent(z.object({
    lines: z.array(z.string().max(32768)).min(1).max(150),
  })),

  /** Dashboard → server: subscribe to core console mirror */
  'dashboard:console:subscribe': defineEvent(z.object({
    botId: z.number().int().positive(),
    tailLines: z.number().int().min(0).max(8000).optional(),
  })),

  'dashboard:console:unsubscribe': defineEvent(z.object({
    botId: z.number().int().positive(),
  })),

  /**
   * Core → server: result of {@link serverToClientEvents['core:plugin:request']}.
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
} as const

// ─── Full contract ───────────────────────────────────────────────────────────

export const fragmentSocketContract = {
  serverToClient: serverToClientEvents,
  clientToServer: clientToServerEvents,
} satisfies SocketContract

export type { FragmentServerToClient, FragmentClientToServer } from './types/events.js'
