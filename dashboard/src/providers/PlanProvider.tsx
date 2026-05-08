import { useEffect, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTRPC } from '@/lib/trpc'
import { useAuthStore } from '@/stores/authStore'
import { usePlanStore } from '@/stores/planStore'

export function PlanProvider({ children }: { children: ReactNode }) {
  const trpc = useTRPC()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isAuthLoading = useAuthStore((state) => state.isLoading)
  const setPlans = usePlanStore((state) => state.setPlans)
  const setLoading = usePlanStore((state) => state.setLoading)

  const plansQuery = useQuery(
    trpc.plans.list.queryOptions(undefined, {
      enabled: isAuthenticated && !isAuthLoading,
    }),
  )

  useEffect(() => {
    if (plansQuery.isLoading) {
      setLoading(true)
    }
  }, [plansQuery.isLoading, setLoading])

  useEffect(() => {
    if (plansQuery.data) {
      setPlans(plansQuery.data)
    }
  }, [plansQuery.data, setPlans])

  return <>{children}</>
}
