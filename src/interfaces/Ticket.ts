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
  description?: string
  messages: Messages[]
  history: History[]
  createAt: number
}

export interface Messages {
  channelId: string
  messageId: string
}

export interface History {
  role: string
  user: {
    id: string
    name: string
  }
  message: {
    id: string
    content: string
  }
  date: Date
  deleted: boolean
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
