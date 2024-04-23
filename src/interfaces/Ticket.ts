export interface Ticket {
  owner: string
  channelId: string
  voice?: {
    id: string
    messageId: string
  }
  users?: Array<{ name: string, displayName: string, id: string }>
  team?: Array<{ name: string, displayName: string, id: string }>
  category: TicketCategories
  messages: Messages[]
  createAt: string
}

export interface Messages {
  channelId: string
  messageId: string
}

export interface TicketCategories {
  title: string
  emoji: string
}

export interface TicketUser {
  preferences?: {
    category?: string
  }
}

export interface TicketConfig {
  limit: number
  claimId: string
}
