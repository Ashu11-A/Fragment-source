export interface Ticket {
  owner: string
  closed: boolean
  channelId: string
  messageId: string
  claim?: Claim
  voice?: {
    id: string
    messageId: string
  }
  users?: User[]
  team?: User[]
  category: TicketCategories
  description?: string
  messages: Messages[]
  history: History[]
  createAt: number
}

export interface Claim {
  messageId: string
  channelId: string
}
export interface User {
  name: string
  displayName: string
  id: string
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
  limit?: number
  claimId?: string
  logsId?: string
}
