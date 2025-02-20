import { WebSocket } from '@fastify/websocket'

export enum BotStatus {
  Connecting = 'connecting',
  Connected = 'connected',
  Disconnected = 'disconnected'
}

export type BotConnection = {
  socket: WebSocket
  status: BotStatus
}