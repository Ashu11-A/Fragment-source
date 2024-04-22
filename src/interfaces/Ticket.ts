export interface Ticket {
  owner: string
  voiceId?: string
  users?: Array<{ name: string, displayName: string, id: string }>
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
}
