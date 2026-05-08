import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Role } from 'server'
import { useAuth } from '@/hooks/useAuth'
import { useTRPC, type RouterOutputs } from '@/lib/trpc'
import { useAuthStore } from '@/stores/authStore'

type CreatorStatsPeriod = 'monthly' | 'quarterly' | 'semiannual'
type MarketplacePlugin = RouterOutputs['plugins']['marketplaceList'][number]
type PublishRequest = RouterOutputs['plugins']['listPublishRequests'][number]

function usePluginMarketplace() {
  const trpc = useTRPC()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isLoading = useAuthStore((state) => state.isLoading)
  const isAuthReady = isAuthenticated && !isLoading
  const [search, setSearch] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  const listQuery = useQuery(trpc.plugins.marketplaceList.queryOptions({ search }, { enabled: isAuthReady }))
  const checkoutMutation = useMutation(trpc.plugins.createCheckout.mutationOptions({
    onError: (error) => {
      setActionError(error.message)
    },
  }))
  const installMutation = useMutation(trpc.bots.plugins.install.mutationOptions({
    onError: (error) => {
      setActionError(error.message)
    },
  }))

  const plugins = listQuery.data ?? []
  const checkoutLoadingPluginId = checkoutMutation.variables?.pluginId

  const totals = useMemo(() => {
    const free = plugins.filter((plugin: MarketplacePlugin) => plugin.price === 0).length
    const paid = plugins.length - free
    return { free, paid }
  }, [plugins])

  const openCheckout = async (pluginId: number) => {
    setActionError(null)
    const successUrl = `${window.location.origin}/plugins?checkout=success`
    const cancelUrl = `${window.location.origin}/plugins?checkout=cancelled`
    const result = await checkoutMutation.mutateAsync({ pluginId, successUrl, cancelUrl })
    if (result.checkoutUrl) {
      window.location.href = result.checkoutUrl
    }
  }

  const installPlugin = async (pluginId: number, botId: number) => {
    setActionError(null)
    await installMutation.mutateAsync({ botId, pluginId })
  }

  return {
    search,
    setSearch,
    plugins,
    totals,
    isLoading: listQuery.isLoading,
    isFetching: listQuery.isFetching,
    error: listQuery.error?.message ?? actionError,
    refetch: listQuery.refetch,
    openCheckout,
    installPlugin,
    isCreatingCheckout: checkoutMutation.isPending,
    isInstallingPlugin: installMutation.isPending,
    checkoutLoadingPluginId,
    installLoadingPluginId: installMutation.variables?.pluginId,
  }
}

function usePluginCreatorStats(initialPeriod: CreatorStatsPeriod = 'monthly') {
  const [period, setPeriod] = useState<CreatorStatsPeriod>(initialPeriod)
  const trpc = useTRPC()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isLoading = useAuthStore((state) => state.isLoading)
  const statsQuery = useQuery(trpc.plugins.creatorStats.queryOptions({ period }, { enabled: isAuthenticated && !isLoading }))
  return {
    period,
    setPeriod,
    stats: statsQuery.data,
    isLoading: statsQuery.isLoading,
    isFetching: statsQuery.isFetching,
    error: statsQuery.error?.message ?? null,
    refetch: statsQuery.refetch,
  }
}

function usePluginPublisherRequests() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isLoading = useAuthStore((state) => state.isLoading)
  const [actionError, setActionError] = useState<string | null>(null)
  const isAdmin = user?.role === Role.Administrator

  const requestsQuery = useQuery(trpc.plugins.listPublishRequests.queryOptions(undefined, {
    enabled: isAuthenticated && !isLoading,
  }))

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries(trpc.plugins.listPublishRequests.queryFilter()),
      queryClient.invalidateQueries(trpc.plugins.marketplaceList.queryFilter()),
    ])
  }

  const createMutation = useMutation(trpc.plugins.createPublishRequest.mutationOptions({
    onSuccess: async () => {
      setActionError(null)
      await invalidate()
    },
    onError: (error) => {
      setActionError(error.message)
    },
  }))

  const updateMutation = useMutation(trpc.plugins.updatePublishRequest.mutationOptions({
    onSuccess: async () => {
      setActionError(null)
      await invalidate()
    },
    onError: (error) => {
      setActionError(error.message)
    },
  }))

  const decideMutation = useMutation(trpc.plugins.decidePublishRequest.mutationOptions({
    onSuccess: async () => {
      setActionError(null)
      await invalidate()
    },
    onError: (error) => {
      setActionError(error.message)
    },
  }))

  const deleteMutation = useMutation(trpc.plugins.deletePublishRequest.mutationOptions({
    onSuccess: async () => {
      setActionError(null)
      await invalidate()
    },
    onError: (error) => {
      setActionError(error.message)
    },
  }))

  const requests = requestsQuery.data ?? []
  const grouped = useMemo(() => {
    const pending = requests.filter((request: PublishRequest) => request.status === 'pending')
    const approved = requests.filter((request: PublishRequest) => request.status === 'approved')
    const rejected = requests.filter((request: PublishRequest) => request.status === 'rejected')
    return { pending, approved, rejected }
  }, [requests])

  return {
    isAdmin,
    requests,
    grouped,
    isLoading: requestsQuery.isLoading,
    isFetching: requestsQuery.isFetching,
    error: requestsQuery.error?.message ?? actionError,
    refetch: requestsQuery.refetch,
    createRequest: createMutation.mutateAsync,
    updateRequest: updateMutation.mutateAsync,
    decideRequest: decideMutation.mutateAsync,
    deleteRequest: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeciding: decideMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

function usePluginManagement() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isLoading = useAuthStore((state) => state.isLoading)
  const [actionError, setActionError] = useState<string | null>(null)

  const pluginsQuery = useQuery(trpc.plugins.list.queryOptions({ page: 1, limit: 100 }, {
    enabled: isAuthenticated && !isLoading,
  }))
  const requestsQuery = useQuery(trpc.plugins.listPublishRequests.queryOptions(undefined, {
    enabled: isAuthenticated && !isLoading,
  }))

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries(trpc.plugins.list.queryFilter()),
      queryClient.invalidateQueries(trpc.plugins.listPublishRequests.queryFilter()),
      queryClient.invalidateQueries(trpc.plugins.marketplaceList.queryFilter()),
    ])
  }

  const createSubmissionMutation = useMutation(trpc.plugins.createSubmission.mutationOptions({
    onSuccess: async () => {
      setActionError(null)
      await invalidate()
    },
    onError: (error) => setActionError(error.message),
  }))

  const createPackageSubmissionMutation = useMutation(trpc.plugins.createPackageSubmission.mutationOptions({
    onSuccess: async () => {
      setActionError(null)
      await invalidate()
    },
    onError: (error) => setActionError(error.message),
  }))

  const createReleaseMutation = useMutation(trpc.plugins.createPackagePublishRequest.mutationOptions({
    onSuccess: async () => {
      setActionError(null)
      await invalidate()
    },
    onError: (error) => setActionError(error.message),
  }))

  const updatePluginMutation = useMutation(trpc.plugins.update.mutationOptions({
    onSuccess: async () => {
      setActionError(null)
      await invalidate()
    },
    onError: (error) => setActionError(error.message),
  }))

  const plugins = pluginsQuery.data?.items ?? []
  const requests = requestsQuery.data ?? []

  return {
    plugins,
    requests,
    isLoading: pluginsQuery.isLoading || requestsQuery.isLoading,
    isFetching: pluginsQuery.isFetching || requestsQuery.isFetching,
    error: pluginsQuery.error?.message ?? requestsQuery.error?.message ?? actionError,
    createSubmission: createSubmissionMutation.mutateAsync,
    createPackageSubmission: createPackageSubmissionMutation.mutateAsync,
    createRelease: createReleaseMutation.mutateAsync,
    updatePlugin: updatePluginMutation.mutateAsync,
    isCreatingSubmission: createSubmissionMutation.isPending,
    isCreatingPackageSubmission: createPackageSubmissionMutation.isPending,
    isCreatingRelease: createReleaseMutation.isPending,
    isUpdatingPlugin: updatePluginMutation.isPending,
  }
}

export function usePlugin(action: 'marketplace'): ReturnType<typeof usePluginMarketplace>
export function usePlugin(action: 'creatorStats', ...args: Parameters<typeof usePluginCreatorStats>): ReturnType<typeof usePluginCreatorStats>
export function usePlugin(action: 'publisherRequests'): ReturnType<typeof usePluginPublisherRequests>
export function usePlugin(action: 'management'): ReturnType<typeof usePluginManagement>
export function usePlugin(action: 'marketplace' | 'creatorStats' | 'publisherRequests' | 'management', ...args: unknown[]) {
  switch (action) {
    case 'marketplace':
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return usePluginMarketplace()
    case 'creatorStats':
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return usePluginCreatorStats(...(args as Parameters<typeof usePluginCreatorStats>))
    case 'publisherRequests':
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return usePluginPublisherRequests()
    case 'management':
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return usePluginManagement()
    default:
      throw new Error(`Unsupported plugin action: ${String(action)}`)
  }
}
