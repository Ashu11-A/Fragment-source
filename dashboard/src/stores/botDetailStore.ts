import { create } from 'zustand'
import type { BotDetailUIState } from '@/types/stores'

export type { BotDetailUIState } from '@/types/stores'

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
