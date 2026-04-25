import { useEffect, useMemo } from 'react'
import { trpc } from '@/lib/trpc'
import { useBotsListStore } from '@/stores/botsListStore'
import { useBotStore } from '@/stores/botStore'
import { useBotDetailStore } from '@/stores/botDetailStore'

const LIST_INPUT = { type: 'your' as const }
const STATUS_POLL_MS = 5000

/**
 * Dados de lista + status (React Query / tRPC). Use na sidebar e em `useBots` — cache compartilhado.
 */
export function useBotsList() {
  const utils = trpc.useUtils()
  const botsQuery = trpc.bots.list.useQuery(LIST_INPUT, {
    staleTime: 30_000,
  })
  const bots = botsQuery.data?.data ?? []
  const botIds = useMemo(() => bots.map((b) => b.id), [bots])

  const statusQuery = trpc.bots.status.useQuery(
    { ids: botIds },
    { enabled: botIds.length > 0, refetchInterval: STATUS_POLL_MS }
  )
  const statuses = statusQuery.data?.data ?? {}

  const refetch = async () => {
    await Promise.all([utils.bots.list.invalidate(), utils.bots.status.invalidate()])
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

/**
 * Página de bots: lista (React Query) + UI (Zustand) + mutações com invalidação de cache.
 */
export function useBots() {
  const store = useBotsListStore()
  const { bots, statuses, isLoading, isFetching, refetch: refetchList } = useBotsList()
  const utils = trpc.useUtils()

  const createMutation = trpc.bots.create.useMutation()
  const updateMutation = trpc.bots.update.useMutation()
  const deleteMutation = trpc.bots.delete.useMutation()

  const filtered = useMemo(() => {
    return bots.filter((b) => b.name.toLowerCase().includes(store.search.toLowerCase()))
  }, [bots, store.search])

  const handleCreate = async () => {
    if (!store.botName.trim()) return
    store.setLoading(true)
    store.setError('')
    try {
      await createMutation.mutateAsync({ name: store.botName.trim() })
      await refetchList()
      store.setCreateOpen(false)
      store.setBotName('')
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
      const id = store.editBotId
      await updateMutation.mutateAsync({ id, name: store.editBotName.trim() })
      await Promise.all([refetchList(), utils.bots.get.invalidate({ id })])
      store.setEditOpen(false)
    } catch (err: unknown) {
      store.setError(err instanceof Error ? err.message : 'Failed to update bot')
    } finally {
      store.setLoading(false)
    }
  }

  const handleToggle = async (id: number, enabled: boolean) => {
    try {
      await updateMutation.mutateAsync({ id, enabled: !enabled })
      await Promise.all([refetchList(), utils.bots.get.invalidate({ id })])
    } catch {
      // silencioso: lista ainda coerente no próximo poll
    }
  }

  const handleDelete = async () => {
    if (!store.deleteBotId) return
    store.setLoading(true)
    store.setError('')
    const deletedId = store.deleteBotId
    try {
      await deleteMutation.mutateAsync({ id: deletedId })
      await Promise.all([refetchList(), utils.bots.get.invalidate({ id: deletedId })])
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
    statuses,
    isLoading,
    isFetching,
    handleCreate,
    handleEdit,
    handleToggle,
    handleDelete,
  }
}

function parseBotId(botId: string | number | undefined) {
  if (botId === undefined) return { id: undefined as number | undefined, isValid: false }
  const id = typeof botId === 'string' ? parseInt(botId, 10) : botId
  return { id, isValid: !isNaN(id) }
}

/**
 * Detalhe de um bot: query + status + sync do bot selecionado na shell + reset de UI de detalhe.
 */
export function useBot(botId: string | number | undefined) {
  const { id, isValid } = parseBotId(botId)
  const setSelectedBotId = useBotStore((s) => s.setSelectedBotId)
  const resetDetail = useBotDetailStore((s) => s.reset)

  const botQuery = trpc.bots.get.useQuery(
    { id: id! },
    { enabled: isValid, staleTime: 15_000 }
  )
  const bot = botQuery.data?.data

  const statusQuery = trpc.bots.status.useQuery(
    { ids: bot && isValid ? [bot.id] : [] },
    { enabled: Boolean(bot) && isValid, refetchInterval: STATUS_POLL_MS }
  )
  const isOnline = Boolean(bot && (statusQuery.data?.data?.[bot.id] ?? false))

  useEffect(() => {
    if (isValid && id !== undefined) setSelectedBotId(id)
  }, [id, isValid, setSelectedBotId])

  useEffect(() => {
    return () => resetDetail()
  }, [id, resetDetail])

  const refetch = async () => {
    if (!isValid || id === undefined) return
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

/** @deprecated use `useBotsListStore` from `@/stores/botsListStore` */
export { useBotsListStore as useBotsStore } from '@/stores/botsListStore'
