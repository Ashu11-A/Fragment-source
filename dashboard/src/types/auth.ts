export type AuthUser = {
  id: number
  name: string
  username: string
  email: string
  language: string
  discordId: string | null
  discordAvatar: string | null
  role: string
  createdAt: Date
  updatedAt: Date
}

export type AuthUserInput = {
  id: number
  name: string
  username: string
  email: string
  language: string
  discordId: string | null
  discordAvatar: string | null
  role: string
  createdAt: string | Date
  updatedAt: string | Date
}
