import { useMutation, useQuery } from '@tanstack/react-query'
import { useTRPC } from '@/lib/trpc'

export function useUser(page: number) {
  const trpc = useTRPC()
  const usersQuery = useQuery(trpc.users.list.queryOptions({ page, limit: 10 }))
  const deleteMutation = useMutation(trpc.users.deleteUserProcedure.mutationOptions())

  return { usersQuery, deleteMutation }
}
