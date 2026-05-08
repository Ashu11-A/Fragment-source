import { useNode } from '@/hooks/useNode'

export function useNodeRouteContext(nodeId: string) {
  const detail = useNode('detail', nodeId)

  return {
    node: detail.node,
    isOnline: detail.isOnline,
    nodeStatus: detail.nodeStatus,
    isLoading: detail.isLoading,
    isFetching: detail.isFetching,
    isError: detail.isError,
    error: detail.error,
    refetch: detail.refetch,
  }
}
