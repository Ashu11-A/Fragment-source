import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from 'server'
import type { AuthUser } from './stores'

export type AuthSessionPayload = inferRouterOutputs<AppRouter>['auth']['discordExchange']

export interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  applyAuthSession: (result: AuthSessionPayload) => Promise<void>
  signup: (data: { name: string; username: string; email: string; language: string; password: string }) => Promise<void>
  logout: () => Promise<void>
}

export type AuthRefreshResult = inferRouterOutputs<AppRouter>['auth']['refresh']

export type CallbackSearch = {
  code?: string
  state?: string
  error?: string
  error_description?: string
}

export type DiscordExchangeResult = inferRouterOutputs<AppRouter>['auth']['discordExchange']

export type BotActivityRow = {
  id: number
  botId: number
  level: string
  category: string
  message: string
  display: 'success' | 'info' | 'error'
  metadata: Record<string, unknown> | null
  source: string | null
  correlationId: string | null
  createdAt: string
}

export interface DialogState<TData> {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  data: TData | undefined
  setData: (data: TData | undefined) => void
  open: (data?: TData) => void
  close: () => void
}

declare module '@tanstack/react-router' {
  interface Register {
    router: import('@tanstack/react-router').AnyRouter
  }
}

export type PluginRow = {
  pluginName: string
  filePath: string
  version?: string
  description?: string | null
  loaded: boolean
}

export interface UserData {
  id: number
  name: string
  username: string
  email: string
  role: string
  createdAt: string
}
