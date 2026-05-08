import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { io as socketIoClient } from 'socket.io-client'
import { dashboardContract, SocketNamespace, TypedSocketClient } from 'socket'
import { useAuth } from '@/hooks/useAuth'
import { getSessionAccessToken } from '@/lib/sessionAccessToken'

type DashboardSocket = TypedSocketClient<typeof dashboardContract.serverToClient, typeof dashboardContract.clientToServer>

interface SocketContextValue {
  socket: DashboardSocket | null
  isConnected: boolean
}

const SocketContext = createContext<SocketContextValue | null>(null)

export function SocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [socket, setSocket] = useState<DashboardSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      if (socket) {
        socket.disconnect()
        setSocket(null)
        setIsConnected(false)
      }
      return
    }

    const token = getSessionAccessToken()
    if (!token) return

    const baseUrl = (import.meta.env.VITE_SERVER_URL as string).replace(/\/$/, '')
    const rawIo = socketIoClient(`${baseUrl}${SocketNamespace.Dashboard}`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    })

    const typedSocket = new TypedSocketClient(rawIo, dashboardContract.serverToClient, SocketNamespace.Dashboard)

    typedSocket.onConnect(() => {
      console.log('[dashboard:socket] Connected to server')
      setIsConnected(true)
    })

    typedSocket.onDisconnect((reason) => {
      console.log(`[dashboard:socket] Disconnected: ${reason}`)
      setIsConnected(false)
    })

    setSocket(typedSocket)

    return () => {
      typedSocket.disconnect()
      setIsConnected(false)
    }
  }, [isAuthenticated])

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider')
  }
  return context
}
