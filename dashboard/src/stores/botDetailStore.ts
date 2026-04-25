import { create } from 'zustand'

/** UI local à página de detalhe do bot (evita prop drilling) */
export interface BotDetailUIState {
  lastTab: 'overview' | 'activity' | 'settings'
  setLastTab: (tab: 'overview' | 'activity' | 'settings') => void
  recentActivityFilter: 'all' | 'success' | 'error' | 'info'
  setRecentActivityFilter: (f: 'all' | 'success' | 'error' | 'info') => void
  reset: () => void
}

const initial: Pick<BotDetailUIState, 'lastTab' | 'recentActivityFilter'> = {
  lastTab: 'overview',
  recentActivityFilter: 'all',
}

export const useBotDetailStore = create<BotDetailUIState>((set) => ({
  ...initial,
  setLastTab: (lastTab) => set({ lastTab }),
  setRecentActivityFilter: (recentActivityFilter) => set({ recentActivityFilter }),
  reset: () => set({ ...initial }),
}))
