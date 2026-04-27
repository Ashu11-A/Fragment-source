import { TypedSocketClient, fragmentSocketContract, reportCoreActivity } from 'socket'
import { io as socketIoClient, type Socket } from 'socket.io-client'
import * as corePkg from '../../package.json' with { type: 'json' }
import { serverStatus } from '@/events/server/status.js'
import { API_URL } from '@/singletons.js'

export let socket: TypedSocketClient<typeof fragmentSocketContract.serverToClient, typeof fragmentSocketContract.clientToServer> | null = null

let rawIo: Socket | null = null

export function getMirrorReady(): boolean {
  return rawIo?.connected === true && serverBotId != null
}

export function emitCoreConsoleLines(lines: string[]): void {
  if (!rawIo?.connected || serverBotId == null || lines.length === 0) return
  rawIo.emit('core:console:push', { lines })
}

/** Alvo de `client:identify` — necessário para `bots.status` achar a sala `bot:{id}`. */
let serverBotId: number | null = null

const coreVersion = (corePkg as unknown as { default?: { version?: string }; version?: string }).default?.version
  ?? (corePkg as unknown as { version?: string }).version
  ?? 'unknown'

function emitIdentify() {
  if (socket == null || serverBotId == null) return
  socket.emit('client:identify', { botId: serverBotId, version: coreVersion })
}

function reportLinkedIfConnected() {
  if (socket == null || serverBotId == null || !socket.connected) return
  reportCoreActivity(socket, {
    level: 'info',
    category: 'core',
    message: 'Core linked to bot (socket ready)',
    display: 'success',
    source: 'core:socket',
    metadata: { botId: serverBotId },
  })
}

export function setServerSocketBotId(botId: number | null) {
  serverBotId = botId
  if (botId != null) {
    emitIdentify()
    reportLinkedIfConnected()
  }
  void import('../logs/logger.js').then((m) => m.pokeMirrorFlush())
}

export function connectSocket(token: string) {
  if (socket) return socket

  const url = API_URL.replace('0.0.0.0', '127.0.0.1')
  const rawSocket = socketIoClient(url, {
    auth: { token },
    transports: process.env.NODE_ENV === 'production' ? ['websocket'] : ['polling', 'websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
  })

  rawIo = rawSocket
  const s = new TypedSocketClient(rawSocket, fragmentSocketContract.serverToClient)
  socket = s

  s.onConnect(() => {
    console.log(`[core:socket] Connected to server! (id: ${s.id})`)
    s.emit('ping')
    emitIdentify()
    reportLinkedIfConnected()
    void import('../logs/logger.js').then((m) => m.pokeMirrorFlush())
  })

  s.onDisconnect((reason) => {
    console.log(`[core:socket] Disconnected: ${reason}`)
  })

  s.onError((error) => {
    console.error(`[core:socket] Connection error: ${error.message}`)
  })

  s.onReconnect((attempt) => {
    console.log(`[core:socket] Reconnected after ${attempt} attempts`)
  })

  serverStatus.register(s)

  return s
}
