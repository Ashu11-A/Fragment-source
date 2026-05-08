import { useEffect, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTRPC } from '@/lib/trpc'
import { useAuthStore } from '@/stores/authStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const trpc = useTRPC()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isAuthLoading = useAuthStore((state) => state.isLoading)
  const setData = useSubscriptionStore((state) => state.setData)
  const setLoading = useSubscriptionStore((state) => state.setLoading)

  const subscriptionsQuery = useQuery(
    trpc.subscriptions.list.queryOptions({}, {
      enabled: isAuthenticated && !isAuthLoading,
    }),
  )

  useEffect(() => {
    if (subscriptionsQuery.isLoading) {
      setLoading(true)
    }
  }, [subscriptionsQuery.isLoading, setLoading])

  useEffect(() => {
    if (subscriptionsQuery.data) {
      setData(subscriptionsQuery.data)
    }
  }, [subscriptionsQuery.data, setData])

  return <>{children}</>
}
