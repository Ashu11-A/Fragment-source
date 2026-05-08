import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSocket } from '@/components/providers/SocketProvider'
import { useTRPC } from '@/lib/trpc'

const STATUS_POLL_MS = 5000
const SOCKET_BASE_URL = (import.meta.env.VITE_SERVER_URL as string).replace(/\/$/, '')

function parseNodeId(nodeId: string | number | undefined) {
  if (nodeId === undefined) return { id: undefined as number | undefined, isValid: false }
  const id = typeof nodeId === 'string' ? parseInt(nodeId, 10) : nodeId
  return { id, isValid: Number.isInteger(id) && id > 0 }
}

function generateNodeCommand(node: { token: string }) {
  return `daemon configure --token ${node.token} --panel-url ${SOCKET_BASE_URL} --override`
}

function getNodeErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function useNodesList() {
  const trpc = useTRPC()
  const nodesQuery = useQuery(trpc.nodes.list.queryOptions(undefined, {
    staleTime: 15_000,
    refetchInterval: STATUS_POLL_MS,
  }))

  return {
    nodes: nodesQuery.data ?? [],
    isLoading: nodesQuery.isLoading,
    isFetching: nodesQuery.isFetching,
    isError: nodesQuery.isError,
    error: nodesQuery.error,
    refetch: nodesQuery.refetch,
  }
}

function useNodeMutations() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  const invalidateNodes = async () => {
    await queryClient.invalidateQueries(trpc.nodes.pathFilter())
  }

  const create = useMutation(trpc.nodes.create.mutationOptions({ onSuccess: invalidateNodes }))
  const update = useMutation(trpc.nodes.update.mutationOptions({ onSuccess: invalidateNodes }))
  const deleteNode = useMutation(trpc.nodes.remove.mutationOptions({ onSuccess: invalidateNodes }))
  const resetToken = useMutation(trpc.nodes.resetToken.mutationOptions({ onSuccess: invalidateNodes }))
  const assignBot = useMutation(trpc.nodes.assignBot.mutationOptions({ onSuccess: invalidateNodes }))
  const unassignBot = useMutation(trpc.nodes.unassignBot.mutationOptions({ onSuccess: invalidateNodes }))

  const isPending = useMemo(
    () => create.isPending || update.isPending || deleteNode.isPending || resetToken.isPending || assignBot.isPending || unassignBot.isPending,
    [assignBot.isPending, create.isPending, deleteNode.isPending, resetToken.isPending, unassignBot.isPending, update.isPending],
  )

  return { create, update, deleteNode, resetToken, assignBot, unassignBot, isPending }
}

function useNodeDetail(nodeId: string | number | undefined) {
  const trpc = useTRPC()
  const { id, isValid } = parseNodeId(nodeId)
  const [nodeStatus, setNodeStatus] = useState<{
    online: boolean
    activeConnections: number
    updatedAt: string | null
    connectedToServer: boolean
  }>({
    online: false,
    activeConnections: 0,
    updatedAt: null,
    connectedToServer: false,
  })

  const nodeQuery = useQuery(trpc.nodes.get.queryOptions(
    { id: id! },
    { enabled: isValid, staleTime: 15_000, refetchInterval: STATUS_POLL_MS }
  ))
  const node = nodeQuery.data

  useEffect(() => {
    setNodeStatus({
      online: false,
      activeConnections: 0,
      updatedAt: null,
      connectedToServer: false,
    })
  }, [id, isValid])

  const { socket, isConnected } = useSocket()

  useEffect(() => {
    setNodeStatus((current) => ({ ...current, connectedToServer: isConnected }))
  }, [isConnected])

  useEffect(() => {
    if (!isValid || id === undefined || !socket || !isConnected) {
      if (!isConnected) {
        setNodeStatus((current) => ({ ...current, online: false, activeConnections: 0, connectedToServer: false }))
      }
      return
    }

    socket.emit('dashboard:node:status:subscribe', { nodeId: id })

    const handler = (status: any) => {
      if (status.nodeId !== id) return
      setNodeStatus({
        online: status.online,
        activeConnections: status.activeConnections,
        updatedAt: status.updatedAt,
        connectedToServer: socket.connected,
      })
    }

    socket.on('node:status', handler)

    return () => {
      socket.off('node:status', handler)
      if (socket.connected) socket.emit('dashboard:node:status:unsubscribe', { nodeId: id })
    }
  }, [id, isValid, socket, isConnected])

  const refetch = async () => {
    if (!isValid || id === undefined) return
    await nodeQuery.refetch()
  }

  return {
    nodeId: id,
    isValidNodeId: isValid,
    node: nodeQuery.isError ? undefined : node,
    isOnline: nodeStatus.online,
    nodeStatus,
    isLoading: nodeQuery.isLoading,
    isFetching: nodeQuery.isFetching,
    isError: nodeQuery.isError,
    error: nodeQuery.error,
    refetch,
  }
}

function useNodeSettingsQueries() {
  const trpc = useTRPC()
  const botsQuery = useQuery(trpc.bots.list.queryOptions({}, { staleTime: 30_000 }))
  return { botsQuery }
}

export const nodeUtils = {
  parseNodeId,
  generateNodeCommand,
  getNodeErrorMessage,
}

export function useNode(action: 'list'): ReturnType<typeof useNodesList>
export function useNode(action: 'mutations'): ReturnType<typeof useNodeMutations>
export function useNode(action: 'detail', ...args: Parameters<typeof useNodeDetail>): ReturnType<typeof useNodeDetail>
export function useNode(action: 'settings'): ReturnType<typeof useNodeSettingsQueries>
export function useNode(action: 'list' | 'mutations' | 'detail' | 'settings', ...args: unknown[]) {
  switch (action) {
    case 'list':
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return useNodesList()
    case 'mutations':
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return useNodeMutations()
    case 'detail':
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return useNodeDetail(...(args as Parameters<typeof useNodeDetail>))
    case 'settings':
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return useNodeSettingsQueries()
    default:
      throw new Error(`Unsupported node action: ${String(action)}`)
  }
}
