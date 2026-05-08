import { z } from 'zod'
import { defineEvent } from '../types/index.js'

// ─── Shared Server → Client events ──────────────────────────────────────────

export const sharedServerToClient = {
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
} as const

// ─── Shared Client → Server events ──────────────────────────────────────────

export const sharedClientToServer = {
  /** Ping for health check */
  'ping': defineEvent(z.void()),

  /** Request the current server status */
  'server:status:request': defineEvent(z.void()),
} as const
