import { useEffect, useMemo, useState } from 'react'
import { io } from 'socket.io-client'
import { TypedSocketClient, fragmentSocketContract } from 'socket'
import { trpc } from '@/lib/trpc'
import type { BotActivityRow } from '@/types/app'

function socketBaseUrl() {
  if (typeof window === 'undefined') return ''
  if (import.meta.env.DEV) return window.location.origin
  return (import.meta.env.VITE_SERVER_URL as string | undefined) || window.location.origin
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

export function useBotActivity(
  botId: number | undefined,
  enabled: boolean,
  options?: { historyLimit?: number; /** Após merge (histórico + live), mantém só as N mais recentes */
    maxRows?: number },
) {
  const limit = options?.historyLimit ?? 80
  const maxRows = options?.maxRows
  /** Menos linhas em memória quando a UI só exibe poucas entradas */
  const liveCap = maxRows != null ? Math.min(48, Math.max(12, maxRows * 8)) : 200

  const listQuery = trpc.bots.activity.list.useQuery(
    { botId: botId!, limit },
    {
      enabled: Boolean(enabled && botId != null),
      staleTime: maxRows != null && maxRows <= 10 ? 60_000 : 30_000,
    },
  )

  const [live, setLive] = useState<BotActivityRow[]>([])

  useEffect(() => {
    setLive([])
  }, [botId])

  useEffect(() => {
    if (!enabled || botId == null) return

    const base = socketBaseUrl()
    const raw = io(base, {
      withCredentials: true,
      transports: import.meta.env.PROD ? ['websocket'] : ['polling', 'websocket'],
    })

    const typed = new TypedSocketClient(raw, fragmentSocketContract.serverToClient)

    raw.on('connect', () => {
      raw.emit('dashboard:activity:subscribe', { botId })
    })

    typed.on('bot:activity', (row) => {
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
    })

    return () => {
      if (raw.connected) {
        raw.emit('dashboard:activity:unsubscribe', { botId })
      }
      raw.disconnect()
    }
  }, [botId, enabled, liveCap])

  const rows = useMemo(() => {
    const history = (listQuery.data?.data ?? []) as BotActivityRow[]
    const map = new Map<number, BotActivityRow>()
    for (const r of history) map.set(r.id, r)
    for (const r of live) map.set(r.id, r)
    let merged = [...map.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    if (maxRows != null && merged.length > maxRows) merged = merged.slice(0, maxRows)
    return merged
  }, [listQuery.data?.data, live, maxRows])

  return {
    rows,
    formatRelativeTime,
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    refetch: listQuery.refetch,
  }
}
