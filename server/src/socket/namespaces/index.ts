import type { FastifyInstance } from 'fastify'
import { coreContract, dashboardContract, nodeContract, SocketNamespace, TypedSocketServer } from 'socket'
import { setupCoreNamespace } from './core.js'
import { setupDashboardNamespace } from './dashboard.js'
import { setupNodeNamespace } from './node.js'

export let coreIo: TypedSocketServer<typeof coreContract.serverToClient, typeof coreContract.clientToServer>
export let dashboardIo: TypedSocketServer<typeof dashboardContract.serverToClient, typeof dashboardContract.clientToServer>
export let nodeIo: TypedSocketServer<typeof nodeContract.serverToClient, typeof nodeContract.clientToServer>

export function getCoreIo() {
  if (coreIo == null) throw new Error('Socket server not initialised')
  return coreIo
}

export function getDashboardIo() {
  if (dashboardIo == null) throw new Error('Socket server not initialised')
  return dashboardIo
}

export function getNodeIo() {
  if (nodeIo == null) throw new Error('Socket server not initialised')
  return nodeIo
}

export function setupSocketNamespaces(fastify: FastifyInstance) {
  // Create typed server instances for each namespace
  coreIo = new TypedSocketServer(fastify.io.of(SocketNamespace.Core), coreContract.clientToServer, SocketNamespace.Core)
  dashboardIo = new TypedSocketServer(fastify.io.of(SocketNamespace.Dashboard), dashboardContract.clientToServer, SocketNamespace.Dashboard)
  nodeIo = new TypedSocketServer(fastify.io.of(SocketNamespace.Node), nodeContract.clientToServer, SocketNamespace.Node)

  // Configure each namespace
  setupCoreNamespace(fastify, coreIo)
  setupDashboardNamespace(fastify, dashboardIo)
  setupNodeNamespace(fastify, nodeIo)
}
