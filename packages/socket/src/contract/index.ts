/**
 * Fragment Socket Contract — Namespace-based event registry.
 *
 * Each domain (core, dashboard, node) has its own typed contract.
 *
 * @example
 * ```ts
 * import { coreContract, dashboardContract, nodeContract } from 'socket'
 * ```
 */

import type { SocketContract } from '../types/index.js'

// ─── Domain contracts ────────────────────────────────────────────────────────

export { sharedServerToClient, sharedClientToServer } from './shared.js'
export { coreServerToClient, coreClientToServer } from './core.js'
export type { CoreServerToClient, CoreClientToServer } from './core.js'
export { dashboardServerToClient, dashboardClientToServer } from './dashboard.js'
export type { DashboardServerToClient, DashboardClientToServer } from './dashboard.js'
export { nodeServerToClient, nodeClientToServer } from './node.js'
export type { NodeServerToClient, NodeClientToServer } from './node.js'

// ─── Namespace path constants ────────────────────────────────────────────────

/** Socket.IO namespace paths for each domain */
export const SocketNamespace = {
  Core: '/core',
  Dashboard: '/dashboard',
  Node: '/node',
} as const

export type SocketNamespacePath = typeof SocketNamespace[keyof typeof SocketNamespace]

// ─── Composed namespace contracts ────────────────────────────────────────────

import { sharedServerToClient, sharedClientToServer } from './shared.js'
import { coreServerToClient, coreClientToServer } from './core.js'
import { dashboardServerToClient, dashboardClientToServer } from './dashboard.js'
import { nodeServerToClient, nodeClientToServer } from './node.js'

/** Complete contract for the `/core` namespace (shared + core events) */
export const coreContract = {
  serverToClient: { ...sharedServerToClient, ...coreServerToClient },
  clientToServer: { ...sharedClientToServer, ...coreClientToServer },
} as const satisfies SocketContract

/** Complete contract for the `/dashboard` namespace (shared + dashboard events) */
export const dashboardContract = {
  serverToClient: { ...sharedServerToClient, ...dashboardServerToClient },
  clientToServer: { ...sharedClientToServer, ...dashboardClientToServer },
} as const satisfies SocketContract

/** Complete contract for the `/node` namespace (shared + node events) */
export const nodeContract = {
  serverToClient: { ...sharedServerToClient, ...nodeServerToClient },
  clientToServer: { ...sharedClientToServer, ...nodeClientToServer },
} as const satisfies SocketContract

// ─── Namespace contract type aliases ─────────────────────────────────────────

export type CoreContract = typeof coreContract
export type DashboardContract = typeof dashboardContract
export type NodeContract = typeof nodeContract

// ─── Full merged type aliases ─────────────────────────────────────────────────

const _mergedServerToClient = {
  ...sharedServerToClient,
  ...coreServerToClient,
  ...dashboardServerToClient,
  ...nodeServerToClient,
} as const

const _mergedClientToServer = {
  ...sharedClientToServer,
  ...coreClientToServer,
  ...dashboardClientToServer,
  ...nodeClientToServer,
} as const

export type FragmentServerToClient = typeof _mergedServerToClient
export type FragmentClientToServer = typeof _mergedClientToServer
