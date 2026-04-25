import { useCallback, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { TypedSocketClient, fragmentSocketContract } from 'socket'

const MAX_LINES = 12_000

function socketBaseUrl() {
  if (typeof window === 'undefined') return ''
  if (import.meta.env.DEV) return window.location.origin
  return (import.meta.env.VITE_SERVER_URL as string | undefined) || window.location.origin
}

export function useBotConsoleStream(botId: number | undefined, enabled: boolean) {
  const [lines, setLines] = useState<string[]>([])

  const clear = useCallback(() => {
    setLines([])
  }, [])

  useEffect(() => {
    setLines([])
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
      raw.emit('dashboard:console:subscribe', { botId, tailLines: 5000 })
    })

    typed.on('bot:console:lines', (payload) => {
      if (payload.mode === 'snapshot') {
        setLines(payload.lines.slice(-MAX_LINES))
        return
      }
      setLines((prev) => {
        const next = [...prev, ...payload.lines]
        if (next.length > MAX_LINES) return next.slice(next.length - MAX_LINES)
        return next
      })
    })

    return () => {
      if (raw.connected) {
        raw.emit('dashboard:console:unsubscribe', { botId })
      }
      raw.disconnect()
    }
  }, [botId, enabled])

  const text = lines.join('\n')

  return { lines, text, clear }
}
