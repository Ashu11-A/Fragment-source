import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTRPC, type RouterInputs, type RouterOutputs } from '@/lib/trpc'
import { useNode } from '@/hooks/useNode'
import { useBotsListStore } from '@/stores/botsListStore'
import { useBotStore } from '@/stores/botStore'
import { useBotDetailStore } from '@/stores/botDetailStore'
import { useAuthStore } from '@/stores/authStore'
import { countAssignedPlugins, filterPluginsByName, parseBotRouteId } from '@/lib/bot-plugin-catalog'
import type { BotActivityRow } from '@/types/app'
import { useSocket } from '@/components/providers/SocketProvider'

const LIST_INPUT = { onlyMine: true as const }
const STATUS_POLL_MS = 5000
const MAX_LINES = 12_000

type CreateBotInput = RouterInputs['bots']['create']
type BotListItem = RouterOutputs['bots']['list']['items'][number]
type BotPluginCatalogRow = RouterOutputs['bots']['plugins']['list']['plugins'][number] & { assigned: boolean }
type PlanListItem = RouterOutputs['plans']['list'][number]
type HostingMode = 'managed' | 'self-hosted'
type ActionState = 'idle' | 'starting' | 'stopping' | 'restarting' | 'deleting' | 'rotating-token'
type BotRuntimeStats = {
  botId: number
  online: boolean
  activePlugins: number
  cpuUsagePercent: number | null
  memoryUsageMb: number | null
  memoryLimitMb: number | null
  updatedAt: string
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function parseBotId(botId: string | number | undefined) {
  if (botId === undefined) return { id: undefined as number | undefined, isValid: false }
  const id = typeof botId === 'string' ? parseInt(botId, 10) : botId
  return { id, isValid: !isNaN(id) }
}

function formatRelativeTime(iso: string) {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return iso
  const diff = Date.now() - t
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 48) return `${h}h ago`
  return new Date(iso).toLocaleString()
}

function useBotsList() {
  const trpc = useTRPC()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isLoading = useAuthStore((state) => state.isLoading)
  const isAuthReady = isAuthenticated && !isLoading
  const botsQuery = useQuery(trpc.bots.list.queryOptions(LIST_INPUT, {
    staleTime: 30_000,
    enabled: isAuthReady,
  }))
  const bots = botsQuery.data?.items ?? []
  const botIds = useMemo(() => bots.map((b: BotListItem) => b.id), [bots])

  const statusQuery = useQuery(trpc.bots.status.queryOptions(
    { botIds },
    { enabled: isAuthReady && botIds.length > 0, refetchInterval: STATUS_POLL_MS }
  ))
  const statuses = statusQuery.data ?? {}

  const refetch = async () => {
    await Promise.all([botsQuery.refetch(), statusQuery.refetch()])
  }

  return {
    bots,
    statuses,
    isLoading: botsQuery.isLoading,
    isFetching: botsQuery.isFetching,
    isError: botsQuery.isError,
    listError: botsQuery.error,
    refetch,
  }
}

function useBotsManager() {
  const trpc = useTRPC()
  const navigate = useNavigate()
  const store = useBotsListStore()
  const { bots, statuses, isLoading, isFetching, refetch: refetchList } = useBotsList()
  const { nodes, isLoading: isLoadingNodes } = useNode('list')

  const createMutation = useMutation(trpc.bots.create.mutationOptions())
  const updateMutation = useMutation(trpc.bots.update.mutationOptions())
  const deleteMutation = useMutation(trpc.bots.delete.mutationOptions())

  const filtered = useMemo(() => bots.filter((b: BotListItem) => b.name.toLowerCase().includes(store.search.toLowerCase())), [bots, store.search])

  const handleCreate = async () => {
    if (!store.botName.trim()) return
    const parsedNodeId = store.selectedNodeId ? parseInt(store.selectedNodeId, 10) : undefined
    const selectedNodeId = Number.isInteger(parsedNodeId) ? parsedNodeId : undefined
    if (selectedNodeId === undefined) {
      store.setError('Select a node')
      return
    }

    store.setLoading(true)
    store.setError('')
    try {
      const result = await createMutation.mutateAsync({
        name: store.botName.trim(),
        nodeIds: selectedNodeId !== undefined ? [selectedNodeId] : [],
      })
      await refetchList()
      store.setCreateOpen(false)
      store.setBotName('')
      store.setSelectedNodeId('')

      if (result.bot) {
        await navigate({
          to: '/bots/$botId' as const,
          params: { botId: String(result.bot.id) }
        })
      }
    } catch (err: unknown) {
      store.setError(err instanceof Error ? err.message : 'Failed to create bot')
    } finally {
      store.setLoading(false)
    }
  }

  const handleEdit = async () => {
    if (!store.editBotId || !store.editBotName.trim()) return
    store.setLoading(true)
    store.setError('')
    try {
      await updateMutation.mutateAsync({ id: store.editBotId, name: store.editBotName.trim() })
      await refetchList()
      store.setEditOpen(false)
    } catch (err: unknown) {
      store.setError(err instanceof Error ? err.message : 'Failed to update bot')
    } finally {
      store.setLoading(false)
    }
  }

  const handleToggle = async (id: number, enabled: boolean) => {
    try {
      await updateMutation.mutateAsync({ id, enabled })
      await refetchList()
    } catch {
      // no-op
    }
  }

  const handleDelete = async () => {
    if (!store.deleteBotId) return
    store.setLoading(true)
    store.setError('')
    try {
      await deleteMutation.mutateAsync({ id: store.deleteBotId })
      await refetchList()
      store.setDeleteOpen(false)
    } catch (err: unknown) {
      store.setError(err instanceof Error ? err.message : 'Failed to delete bot')
    } finally {
      store.setLoading(false)
    }
  }

  return {
    ...store,
    bots,
    filtered,
    nodes,
    statuses,
    isLoading,
    isFetching,
    isLoadingNodes,
    handleCreate,
    handleEdit,
    handleToggle,
    handleDelete,
  }
}

function useBotDetail(botId: string | number | undefined, options?: { enableStatusPolling?: boolean }) {
  const trpc = useTRPC()
  const { id, isValid } = parseBotId(botId)
  const setSelectedBotId = useBotStore((s) => s.setSelectedBotId)
  const resetDetail = useBotDetailStore((s) => s.reset)
  const enableStatusPolling = options?.enableStatusPolling ?? true

  const botQuery = useQuery(trpc.bots.get.queryOptions({ id: id! }, { enabled: isValid, staleTime: 15_000 }))
  const bot = botQuery.data

  const statusQuery = useQuery(trpc.bots.status.queryOptions(
    { botIds: bot && isValid ? [bot.id] : [] },
    {
      enabled: enableStatusPolling && Boolean(bot) && isValid,
      refetchInterval: enableStatusPolling ? STATUS_POLL_MS : false,
    }
  ))

  const isOnline = enableStatusPolling
    ? Boolean(bot && (statusQuery.data?.[bot.id] ?? false))
    : false

  useEffect(() => {
    if (isValid && id !== undefined) setSelectedBotId(id)
  }, [id, isValid, setSelectedBotId])

  useEffect(() => () => resetDetail(), [id, resetDetail])

  const refetch = async () => {
    if (!isValid || id === undefined) return
    if (!enableStatusPolling) {
      await botQuery.refetch()
      return
    }
    await Promise.all([botQuery.refetch(), statusQuery.refetch()])
  }

  return {
    bot: botQuery.isError ? undefined : bot,
    isOnline,
    isLoading: botQuery.isLoading,
    isFetching: botQuery.isFetching,
    isError: botQuery.isError,
    error: botQuery.error,
    refetch,
  }
}

function useBotActivity(botId: number | undefined, enabled: boolean, options?: { historyLimit?: number; maxRows?: number }) {
  const trpc = useTRPC()
  const limit = options?.historyLimit ?? 80
  const maxRows = options?.maxRows
  const liveCap = maxRows != null ? Math.min(48, Math.max(12, maxRows * 8)) : 200

  const listQuery = useQuery(trpc.bots.activity.list.queryOptions({ botId: botId!, limit }, {
    enabled: Boolean(enabled && botId != null),
    staleTime: maxRows != null && maxRows <= 10 ? 60_000 : 30_000,
  }))

  const [live, setLive] = useState<BotActivityRow[]>([])
  useEffect(() => setLive([]), [botId])

  const { socket, isConnected } = useSocket()

  useEffect(() => {
    if (!enabled || botId == null || !socket || !isConnected) return

    socket.emit('dashboard:activity:subscribe', { botId })

    const handler = (row: any) => {
      if (row.botId !== botId) return
      setLive((prev) => {
        const next: BotActivityRow[] = [
          {
            id: row.id,
            botId: row.botId,
            level: row.level,
            category: row.category,
            message: row.message,
            display: row.display,
            metadata: row.metadata ?? null,
            source: row.source ?? null,
            correlationId: row.correlationId ?? null,
            createdAt: row.createdAt,
          },
          ...prev.filter((p) => p.id !== row.id),
        ]
        return next.slice(0, liveCap)
      })
    }

    socket.on('bot:activity', handler)

    return () => {
      socket.off('bot:activity', handler)
      if (socket.connected) socket.emit('dashboard:activity:unsubscribe', { botId })
    }
  }, [botId, enabled, liveCap, socket, isConnected])

  const rows = useMemo(() => {
    const history = (listQuery.data ?? []) as BotActivityRow[]
    const map = new Map<number, BotActivityRow>()
    for (const r of history) map.set(r.id, r)
    for (const r of live) map.set(r.id, r)
    let merged = [...map.values()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    if (maxRows != null && merged.length > maxRows) merged = merged.slice(0, maxRows)
    return merged
  }, [listQuery.data, live, maxRows])

  return {
    rows,
    formatRelativeTime,
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    refetch: listQuery.refetch,
  }
}

function useBotConsoleStream(botId: number | undefined, enabled: boolean) {
  const [lines, setLines] = useState<string[]>([])
  const clear = useCallback(() => setLines([]), [])

  useEffect(() => setLines([]), [botId])

  const { socket, isConnected } = useSocket()

  useEffect(() => {
    if (!enabled || botId == null || !socket || !isConnected) return

    socket.emit('dashboard:console:subscribe', { botId, tailLines: 5000 })

    const handler = (payload: any) => {
      if (payload.mode === 'snapshot') {
        setLines(payload.lines.slice(-MAX_LINES))
        return
      }
      setLines((prev) => {
        const next = [...prev, ...payload.lines]
        if (next.length > MAX_LINES) return next.slice(next.length - MAX_LINES)
        return next
      })
    }

    socket.on('bot:console:lines', handler)

    return () => {
      socket.off('bot:console:lines', handler)
      if (socket.connected) socket.emit('dashboard:console:unsubscribe', { botId })
    }
  }, [botId, enabled, socket, isConnected])

  return { lines, text: lines.join('\n'), clear }
}

function useBotManagement(botId: number) {
  const trpc = useTRPC()
  const navigate = useNavigate()
  const [actionState, setActionState] = useState<ActionState>('idle')
  const [error, setError] = useState('')

  const updateMutation = useMutation(trpc.bots.update.mutationOptions())
  const deleteMutation = useMutation(trpc.bots.delete.mutationOptions())
  const initializeMutation = useMutation(trpc.bots.initialize.mutationOptions())
  const setTokenMutation = useMutation(trpc.bots.token.set.mutationOptions())

  const run = async <T>(state: ActionState, operation: () => Promise<T>) => {
    setActionState(state)
    setError('')
    try {
      return await operation()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Bot action failed')
      throw cause
    } finally {
      setActionState('idle')
    }
  }

  return {
    error,
    setError,
    actionState,
    isBusy: actionState !== 'idle',
    startBot: () => run('starting', async () => updateMutation.mutateAsync({ id: botId, enabled: true })),
    stopBot: () => run('stopping', async () => updateMutation.mutateAsync({ id: botId, enabled: false })),
    restartBot: () => run('restarting', async () => {
      await updateMutation.mutateAsync({ id: botId, enabled: false })
      await wait(600)
      await updateMutation.mutateAsync({ id: botId, enabled: true })
    }),
    deleteBot: () => run('deleting', async () => {
      await deleteMutation.mutateAsync({ id: botId })
      await navigate({ to: '/bots' })
    }),
    setDiscordToken: (discordToken: string) => run('rotating-token', async () => {
      await setTokenMutation.mutateAsync({ botId, discordToken })
    }),
    rotateDiscordToken: (discordToken: string) => run('rotating-token', async () => {
      await initializeMutation.mutateAsync({ botId, discordToken })
    }),
  }
}

function useBotPlugins(botId: string | number | undefined) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { id: numericBotId, isValid } = parseBotRouteId(botId)
  const { bot, isLoading: botLoading, isError: botError, refetch: refetchBot } = useBotDetail(botId)

  const [search, setSearch] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [lastSuccess, setLastSuccess] = useState<string | null>(null)

  const listQuery = useQuery(trpc.bots.plugins.list.queryOptions({ botId: numericBotId! }, { enabled: isValid && Boolean(bot), retry: false }))

  const invalidatePluginQueries = async () => {
    if (!isValid || numericBotId === undefined) return
    await Promise.all([
      queryClient.invalidateQueries(trpc.bots.plugins.list.queryFilter({ botId: numericBotId })),
      queryClient.invalidateQueries(trpc.bots.get.queryFilter({ id: numericBotId })),
    ])
  }

  const assignMutation = useMutation(trpc.bots.plugins.assign.mutationOptions({
    onSuccess: async () => {
      setActionError(null)
      setLastSuccess('Plugin assigned successfully')
      await invalidatePluginQueries()
    },
    onError: (error) => {
      setActionError(error.message)
    },
  }))

  const unassignMutation = useMutation(trpc.bots.plugins.unassign.mutationOptions({
    onSuccess: async () => {
      setActionError(null)
      setLastSuccess('Plugin unassigned successfully')
      await invalidatePluginQueries()
    },
    onError: (error) => {
      setActionError(error.message)
    },
  }))

  const plugins = useMemo(
    () => (listQuery.data?.plugins ?? []).map((p) => ({ ...p, assigned: true as boolean })),
    [listQuery.data?.plugins]
  )
  const filteredPlugins = useMemo(() => filterPluginsByName(plugins, search), [plugins, search])
  const assignedCount = useMemo(() => countAssignedPlugins(plugins), [plugins])
  const isMutating = assignMutation.isPending || unassignMutation.isPending
  const mutatingPluginId = assignMutation.variables?.pluginId ?? unassignMutation.variables?.pluginId

  const togglePluginAssignment = async (plugin: BotPluginCatalogRow) => {
    if (!isValid || numericBotId === undefined) return
    setActionError(null)
    setLastSuccess(null)
    if (plugin.assigned) {
      await unassignMutation.mutateAsync({ botId: numericBotId, pluginId: plugin.id })
      return
    }
    await assignMutation.mutateAsync({ botId: numericBotId, pluginId: plugin.id })
  }

  return {
    bot,
    isLoading: botLoading,
    isError: botError,
    refetch: async () => Promise.all([refetchBot(), listQuery.refetch()]),
    search,
    setSearch,
    plugins,
    filteredPlugins,
    assignedCount,
    isFetchingPlugins: listQuery.isFetching,
    isLoadingPlugins: listQuery.isLoading,
    pluginsError: listQuery.error?.message ?? null,
    actionError,
    lastSuccess,
    isMutating,
    mutatingPluginId,
    togglePluginAssignment,
  }
}

function useBotRuntimeStats(
  botId: number | undefined,
  memoryLimitMb: number | null | undefined,
  pluginCount: number,
  enabled: boolean,
  initialOnline = false,
) {
  const [stats, setStats] = useState<BotRuntimeStats | null>(null)

  useEffect(() => {
    if (botId == null) {
      setStats(null)
      return
    }

    setStats({
      botId,
      online: initialOnline,
      activePlugins: pluginCount,
      cpuUsagePercent: null,
      memoryUsageMb: null,
      memoryLimitMb: memoryLimitMb ?? null,
      updatedAt: new Date().toISOString(),
    })
  }, [botId, initialOnline, memoryLimitMb, pluginCount])

  const { socket, isConnected } = useSocket()

  useEffect(() => {
    if (!enabled || botId == null || !socket || !isConnected) return

    socket.emit('dashboard:runtime:subscribe', { botId })

    const handler = (data: any) => {
      if (data == null || typeof data !== 'object') return
      if (data.botId !== botId) return
      setStats(data as BotRuntimeStats)
    }

    socket.on('bot:runtime:stats', handler)

    return () => {
      socket.off('bot:runtime:stats', handler)
      if (socket.connected) socket.emit('dashboard:runtime:unsubscribe', { botId })
    }
  }, [botId, enabled, socket, isConnected])

  return { stats }
}

function usePlanBotCreation() {
  const trpc = useTRPC()
  const navigate = useNavigate()
  const createMutation = useMutation(trpc.bots.create.mutationOptions())
  const plansQuery = useQuery(trpc.plans.list.queryOptions())
  const { nodes, isLoading: isLoadingNodes } = useNode('list')
  const plans = plansQuery.data ?? []

  const [selectedPlanKey, setSelectedPlanKey] = useState('free')
  const [botName, setBotName] = useState('')
  const [hostingMode, setHostingMode] = useState<HostingMode>('managed')
  const [selectedNodeId, setSelectedNodeId] = useState('')
  const [error, setError] = useState('')

  const selectedPlan = useMemo(
    () => plans.find((plan: PlanListItem) => plan.key === selectedPlanKey) ?? plans[0] ?? null,
    [plans, selectedPlanKey],
  )

  useEffect(() => {
    if (selectedPlan || plans.length === 0) return
    setSelectedPlanKey(plans[0].key)
  }, [plans, selectedPlan])

  const nodeOptions = useMemo(() => nodes, [nodes])

  const canSubmit = selectedPlan != null && botName.trim().length > 0 && (hostingMode === 'self-hosted' || selectedNodeId.length > 0)

  const createBot = async () => {
    setError('')
    if (!botName.trim()) {
      setError('Choose a bot name before continuing.')
      return
    }
    if (!selectedPlan) {
      setError('No active plan available.')
      return
    }
    if (hostingMode === 'managed' && selectedNodeId.length === 0) {
      setError('Select an online node for managed hosting.')
      return
    }

    const parsedNodeId = selectedNodeId ? parseInt(selectedNodeId, 10) : undefined
    const nodeId = Number.isInteger(parsedNodeId) ? parsedNodeId : undefined

    const payload: CreateBotInput = {
      name: botName.trim(),
      nodeIds: nodeId !== undefined ? [nodeId] : [],
      planId: selectedPlan.id,
    }

    try {
      const result = await createMutation.mutateAsync(payload)
      if (result.bot) {
        await navigate({
          to: '/bots/$botId' as const,
          params: { botId: String(result.bot.id) }
        })
      }
      setBotName('')
      setSelectedNodeId('')
      setHostingMode('managed')
      setSelectedPlanKey('free')
    } catch (createError: unknown) {
      setError(createError instanceof Error ? createError.message : 'Failed to create bot from selected plan.')
    }
  }

  return {
    selectedPlan,
    plans,
    isLoadingPlans: plansQuery.isLoading,
    selectedPlanKey,
    setSelectedPlanKey,
    botName,
    setBotName,
    hostingMode,
    setHostingMode,
    selectedNodeId,
    setSelectedNodeId,
    nodeOptions,
    isLoadingNodes,
    isCreating: createMutation.isPending,
    canSubmit,
    error,
    setError,
    createBot,
  }
}

export function useBot(action: 'list'): ReturnType<typeof useBotsList>
export function useBot(action: 'manager'): ReturnType<typeof useBotsManager>
export function useBot(action: 'detail', ...args: Parameters<typeof useBotDetail>): ReturnType<typeof useBotDetail>
export function useBot(action: 'activity', ...args: Parameters<typeof useBotActivity>): ReturnType<typeof useBotActivity>
export function useBot(action: 'consoleStream', ...args: Parameters<typeof useBotConsoleStream>): ReturnType<typeof useBotConsoleStream>
export function useBot(action: 'management', ...args: Parameters<typeof useBotManagement>): ReturnType<typeof useBotManagement>
export function useBot(action: 'plugins', ...args: Parameters<typeof useBotPlugins>): ReturnType<typeof useBotPlugins>
export function useBot(action: 'runtimeStats', ...args: Parameters<typeof useBotRuntimeStats>): ReturnType<typeof useBotRuntimeStats>
export function useBot(action: 'planCreation'): ReturnType<typeof usePlanBotCreation>
export function useBot(action: 'store'): ReturnType<typeof useBotsListStore>
export function useBot(action: 'list' | 'manager' | 'detail' | 'activity' | 'consoleStream' | 'management' | 'plugins' | 'runtimeStats' | 'planCreation' | 'store', ...args: unknown[]) {
  switch (action) {
    case 'list':
      return useBotsList()
    case 'manager':
      return useBotsManager()
    case 'detail':
      return useBotDetail(...(args as Parameters<typeof useBotDetail>))
    case 'activity':
      return useBotActivity(...(args as Parameters<typeof useBotActivity>))
    case 'consoleStream':
      return useBotConsoleStream(...(args as Parameters<typeof useBotConsoleStream>))
    case 'management':
      return useBotManagement(...(args as Parameters<typeof useBotManagement>))
    case 'plugins':
      return useBotPlugins(...(args as Parameters<typeof useBotPlugins>))
    case 'runtimeStats':
      return useBotRuntimeStats(...(args as Parameters<typeof useBotRuntimeStats>))
    case 'planCreation':
      return usePlanBotCreation()
    case 'store':
      return useBotsListStore()
    default:
      throw new Error(`Unsupported bot action: ${String(action)}`)
  }
}
