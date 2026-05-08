import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTRPC } from '@/lib/trpc'
import { useAuthStore } from '@/stores/authStore'

export function useReleases() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isLoading = useAuthStore((state) => state.isLoading)
  const [actionError, setActionError] = useState<string | null>(null)

  const listQuery = useQuery(trpc.releases.list.queryOptions({ page: 1, limit: 100 }, {
    enabled: isAuthenticated && !isLoading,
  }))

  const invalidate = async () => {
    await queryClient.invalidateQueries(trpc.releases.list.queryFilter())
  }

  const createMutation = useMutation(trpc.releases.create.mutationOptions({
    onSuccess: async () => {
      setActionError(null)
      await invalidate()
    },
    onError: (error) => setActionError(error.message),
  }))

  const updateMutation = useMutation(trpc.releases.update.mutationOptions({
    onSuccess: async () => {
      setActionError(null)
      await invalidate()
    },
    onError: (error) => setActionError(error.message),
  }))

  return {
    releases: listQuery.data?.items ?? [],
    isLoading: listQuery.isLoading,
    isFetching: listQuery.isFetching,
    error: listQuery.error?.message ?? actionError,
    createRelease: createMutation.mutateAsync,
    updateRelease: updateMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  }
}
