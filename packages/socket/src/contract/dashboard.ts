import { z } from 'zod'
import { defineEvent } from '../types/index.js'

// ─── Server → Dashboard events ──────────────────────────────────────────────
// Events that the SERVER sends TO the DASHBOARD.

export const dashboardServerToClient = {
  /** Batched plain-text console lines from the core process */
  'bot:console:lines': defineEvent(z.object({
    lines: z.array(z.string().max(32768)),
    /** `snapshot` = last buffer after subscribe; `append` = live stream */
    mode: z.enum(['append', 'snapshot']),
  })),

  /** New persisted activity row for a bot */
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

  /** Runtime snapshot for a bot (status + plugins + resource usage) */
  'bot:runtime:stats': defineEvent(z.object({
    botId: z.number().int().positive(),
    online: z.boolean(),
    activePlugins: z.number().int().nonnegative(),
    cpuUsagePercent: z.number().nonnegative().nullable(),
    memoryUsageMb: z.number().nonnegative().nullable(),
    memoryLimitMb: z.number().int().positive().nullable(),
    updatedAt: z.string(),
  })),

  /** Runtime connection state for a node daemon */
  'node:status': defineEvent(z.object({
    nodeId: z.number().int().positive(),
    online: z.boolean(),
    activeConnections: z.number().int().nonnegative(),
    updatedAt: z.string(),
  })),

  /**
   * Server → dashboard: pending license acceptance request forwarded to the bot owner.
   * NOTE: This was incorrectly placed in clientToServer in the previous version.
   */
  'bot:license:request': defineEvent(z.object({
    botId: z.number().int().positive(),
    licenseText: z.string().min(1),
    language: z.string().min(1).max(16),
    version: z.string().min(1).max(64),
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
} as const

// ─── Dashboard → Server events ──────────────────────────────────────────────
// Events that the DASHBOARD sends TO the SERVER.

export const dashboardClientToServer = {
  /** Dashboard → server: subscribe to real-time activity for a bot (ownership checked) */
  'dashboard:activity:subscribe': defineEvent(z.object({
    botId: z.number().int().positive(),
  })),

  /** Dashboard → server: leave the activity stream for a bot */
  'dashboard:activity:unsubscribe': defineEvent(z.object({
    botId: z.number().int().positive(),
  })),

  /** Dashboard → server: subscribe to core console mirror */
  'dashboard:console:subscribe': defineEvent(z.object({
    botId: z.number().int().positive(),
    tailLines: z.number().int().min(0).max(8000).optional(),
  })),

  /** Dashboard → server: leave core console mirror */
  'dashboard:console:unsubscribe': defineEvent(z.object({
    botId: z.number().int().positive(),
  })),

  /** Dashboard → server: subscribe to runtime stats updates for a bot */
  'dashboard:runtime:subscribe': defineEvent(z.object({
    botId: z.number().int().positive(),
  })),

  /** Dashboard → server: unsubscribe from runtime stats */
  'dashboard:runtime:unsubscribe': defineEvent(z.object({
    botId: z.number().int().positive(),
  })),

  /** Dashboard → server: subscribe to daemon connection state for a node */
  'dashboard:node:status:subscribe': defineEvent(z.object({
    nodeId: z.number().int().positive(),
  })),

  /** Dashboard → server: leave daemon connection state updates for a node */
  'dashboard:node:status:unsubscribe': defineEvent(z.object({
    nodeId: z.number().int().positive(),
  })),

  /**
   * Dashboard → server: user's response to a pending license acceptance request.
   */
  'dashboard:license:response': defineEvent(z.object({
    botId: z.number().int().positive(),
    accepted: z.boolean(),
  })),
} as const

// ─── Dashboard namespace contract ────────────────────────────────────────────

export type DashboardServerToClient = typeof dashboardServerToClient
export type DashboardClientToServer = typeof dashboardClientToServer
