import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { BotState } from '@/types/stores'

export type { BotState } from '@/types/stores'

export const useBotStore = create<BotState>()(
  persist(
    (set) => ({
      selectedBotId: null,
      setSelectedBotId: (selectedBotId) => set({ selectedBotId }),
    }),
    {
      name: 'fragment-bot',
      partialize: (state) => ({ selectedBotId: state.selectedBotId }),
    },
  ),
)
