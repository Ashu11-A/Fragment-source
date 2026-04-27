import type { CachedInteraction } from './interactions.js'

export interface TicketOptions {
  interaction: CachedInteraction
}

export interface TicketCreate {
  title: string
  description: string
  channelId: string
  guildId: string
}

export interface ClaimOptions {
  ticketId: number
  channelId: string
}
