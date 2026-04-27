import type { APITextInputComponent } from 'discord.js'

export interface User {
  name: string
  displayName: string
  id: string
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

export interface Event {
  user: {
    id: string
    name: string
  }
  message: string
  date: Date
}

export interface Message {
  channelId: string
  messageId: string
}

export interface TicketCategories {
  title: string
  emoji: string
}

export interface Voice {
  id: string
  messageId: string
}

export interface TicketType {
  ownerId?: string
  title?: string
  description?: string
  closed: boolean
  channelId?: string
  messageId?: string
  claim?: Message
  voice?: Voice
  category: TicketCategories
  team: User[]
  users: User[]
  history: History[]
  messages: Message[]
  events: Event[]
}

export interface Roles {
  id: string
  name: string
}

export interface TextInputComponent extends APITextInputComponent {
  title: string
  database: string
}
