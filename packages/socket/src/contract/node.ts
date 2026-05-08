import { z } from 'zod'
import { defineEvent } from '../types/index.js'

// ─── Server → Node daemon events ────────────────────────────────────────────
// Events that the SERVER sends TO the NODE DAEMON (Rust process).

export const nodeServerToClient = {
  /**
   * Server → node daemon: create a Bun-backed Docker container and seed it
   * with files transferred through Socket.IO.
   */
  'node:instance:create': defineEvent(z.object({
    requestId: z.string().min(1).max(128),
    action: z.literal('create'),
    name: z.string().min(1).max(256),
    image: z.literal('oven/bun:latest').default('oven/bun:latest'),
    botId: z.number().int().positive().optional(),
    pluginId: z.number().int().positive().optional(),
    pluginDeployUrl: z.string().url().max(4096).optional(),
    tokenFetchUrl: z.string().url().max(4096).optional(),
    startCommand: z.string().min(1).max(4096).optional(),
    envs: z.array(z.string().max(4096)).max(256).optional(),
    ports: z.record(z.string(), z.string()).optional(),
    memoryLimitMb: z.number().int().positive().optional(),
    cpuLimitPercentage: z.number().int().min(1).max(100).optional(),
    files: z.array(z.object({
      path: z.string().min(1).max(512),
      contentBase64: z.string().min(1).max(20_000_000),
    })).max(512).default([]),
  })),

  /**
   * Server → node daemon: control an existing Docker-backed instance.
   */
  'node:instance:action': defineEvent(z.object({
    requestId: z.string().min(1).max(128),
    action: z.enum(['start', 'stop', 'restart']),
    name: z.string().min(1).max(256),
    botId: z.number().int().positive().optional(),
  })),

  /**
   * Server → node daemon: inject the Discord token into an existing bot
   * workspace and unblock/start its Bun container.
   */
  'node:bot:initialize': defineEvent(z.object({
    requestId: z.string().min(1).max(128),
    botId: z.number().int().positive(),
    containerName: z.string().min(1).max(256),
    tokenFetchUrl: z.string().url().max(4096),
  })),

  /**
   * Server → node daemon: install a plugin on an existing bot container.
   */
  'node:bot:plugin:install': defineEvent(z.object({
    requestId: z.string().min(1).max(128),
    botId: z.number().int().positive(),
    containerName: z.string().min(1).max(256),
    pluginDeployUrl: z.string().url().max(4096),
  })),
} as const

// ─── Node daemon → Server events ────────────────────────────────────────────
// Events that the NODE DAEMON sends TO the SERVER.

export const nodeClientToServer = {
  /**
   * Node daemon → server: result of a node Docker instance action.
   */
  'node:instance:result': defineEvent(z.object({
    requestId: z.string().min(1).max(128),
    ok: z.boolean(),
    action: z.enum(['create', 'start', 'stop', 'restart']),
    message: z.string().optional(),
    details: z.string().optional(),
    instance: z.object({
      id: z.number().int(),
      container_id: z.string().nullable().optional(),
      name: z.string(),
      image: z.string(),
      status: z.string(),
      ports: z.string().nullable().optional(),
      env_vars: z.string().nullable().optional(),
      volume_name: z.string().nullable().optional(),
    }).optional(),
  })),

  /**
   * Node daemon → server: result of a bot initialization request.
   */
  'node:bot:initialize:result': defineEvent(z.object({
    requestId: z.string().min(1).max(128),
    ok: z.boolean(),
    botId: z.number().int().positive(),
    message: z.string().optional(),
    details: z.string().optional(),
  })),

  /**
   * Node daemon → server: result of a bot plugin install request.
   */
  'node:bot:plugin:install:result': defineEvent(z.object({
    requestId: z.string().min(1).max(128),
    ok: z.boolean(),
    botId: z.number().int().positive(),
    message: z.string().optional(),
    details: z.string().optional(),
  })),

  /**
   * Node daemon → server: bot container started but has no DISCORD_TOKEN — needs initialization.
   */
  'node:bot:token:missing': defineEvent(z.object({
    botId: z.number().int().positive(),
    containerName: z.string().min(1).max(256),
  })),
} as const

// ─── Node namespace contract ─────────────────────────────────────────────────

export type NodeServerToClient = typeof nodeServerToClient
export type NodeClientToServer = typeof nodeClientToServer
