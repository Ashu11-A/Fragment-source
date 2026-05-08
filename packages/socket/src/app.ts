// ─── Core types & utilities ──────────────────────────────────────────────────
export * from './types/index.js'
export type { FragmentTypedSocket, FragmentTypedServer, FragmentTypedClient } from './types/event.js'

// ─── Domain contracts (preferred for new code) ───────────────────────────────
export {
  coreContract,
  dashboardContract,
  nodeContract,
  SocketNamespace,
  // Individual domain event maps (for advanced usage)
  sharedServerToClient,
  sharedClientToServer,
  coreServerToClient,
  coreClientToServer,
  dashboardServerToClient,
  dashboardClientToServer,
  nodeServerToClient,
  nodeClientToServer,
} from './contract/index.js'

export type {
  CoreContract,
  DashboardContract,
  NodeContract,
  CoreServerToClient,
  CoreClientToServer,
  DashboardServerToClient,
  DashboardClientToServer,
  NodeServerToClient,
  NodeClientToServer,
  SocketNamespacePath,
  FragmentServerToClient,
  FragmentClientToServer,
} from './contract/index.js'

// ─── Wrappers ────────────────────────────────────────────────────────────────
export * from './server.js'
export * from './client.js'
export * from './server/namespace.js'

// ─── Event handler classes ───────────────────────────────────────────────────
export * from './event.js'

// ─── Utilities ───────────────────────────────────────────────────────────────
export * from './reporters.js'
