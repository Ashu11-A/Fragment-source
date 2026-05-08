import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { useTRPC } from '@/lib/trpc'

function useSubscriptionList() {
  const trpc = useTRPC()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isLoading = useAuthStore((state) => state.isLoading)
  const isAuthReady = isAuthenticated && !isLoading

  const listQuery = useQuery(
    trpc.subscriptions.list.queryOptions({}, { enabled: isAuthReady }),
  )

  return {
    subscriptions: listQuery.data?.items ?? [],
    total: listQuery.data?.total ?? 0,
    page: listQuery.data?.page ?? 1,
    limit: listQuery.data?.limit ?? 10,
    pageCount: listQuery.data?.pageCount ?? 0,
    isLoading: listQuery.isLoading,
    isFetching: listQuery.isFetching,
    error: listQuery.error?.message ?? null,
    refetch: listQuery.refetch,
  }
}

export function useSubscription(action: 'list'): ReturnType<typeof useSubscriptionList>
export function useSubscription(action: 'list') {
  switch (action) {
    case 'list':
      return useSubscriptionList()
    default:
      throw new Error(`Unsupported subscription action: ${String(action)}`)
  }
}
