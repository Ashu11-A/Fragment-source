import { useQuery } from '@tanstack/react-query'
import { useTRPC } from '@/lib/trpc'

export function useAdmin() {
  const trpc = useTRPC()
  const summaryQuery = useQuery(trpc.stats.summary.queryOptions())
  return { summaryQuery }
}
