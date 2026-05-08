import type { RouterOutputs } from '@/lib/trpc'
import type { AuthUser } from '@/types/auth'

export type SubscriptionListResponse = RouterOutputs['subscriptions']['list']

export interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean

  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  clear: () => void
}

export interface BotsListUIState {
  search: string
  setSearch: (search: string) => void
  createOpen: boolean
  setCreateOpen: (open: boolean) => void
  editOpen: boolean
  setEditOpen: (open: boolean) => void
  deleteOpen: boolean
  setDeleteOpen: (open: boolean) => void
  botName: string
  setBotName: (name: string) => void
  selectedNodeId: string
  setSelectedNodeId: (nodeId: string) => void
  editBotId: number | null
  setEditBotId: (id: number | null) => void
  editBotName: string
  setEditBotName: (name: string) => void
  deleteBotId: number | null
  setDeleteBotId: (id: number | null) => void
  deleteBotName: string
  setDeleteBotName: (name: string) => void
  loading: boolean
  setLoading: (loading: boolean) => void
  error: string
  setError: (error: string) => void
  resetListDialogs: () => void
}

export interface BotDetailUIState {
  lastTab: 'overview' | 'activity' | 'settings'
  setLastTab: (tab: 'overview' | 'activity' | 'settings') => void
  recentActivityFilter: 'all' | 'success' | 'error' | 'info'
  setRecentActivityFilter: (f: 'all' | 'success' | 'error' | 'info') => void
  reset: () => void
}

export interface BotState {
  selectedBotId: number | null
  setSelectedBotId: (id: number | null) => void
}

export type Theme = 'dark' | 'light'

export interface UIState {
  theme: Theme
  sidebarCollapsed: boolean
  searchQuery: string

  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  setSearchQuery: (query: string) => void
}

export interface SubscriptionState extends SubscriptionListResponse {
  isLoading: boolean
  isFetched: boolean

  setData: (data: SubscriptionListResponse) => void
  setLoading: (loading: boolean) => void
  setFetched: (fetched: boolean) => void
}

export interface PlanState {
  plans: RouterOutputs['plans']['list']
  isLoading: boolean
  isFetched: boolean

  setPlans: (plans: RouterOutputs['plans']['list']) => void
  setLoading: (loading: boolean) => void
  setFetched: (fetched: boolean) => void
}
