import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface BotState {
  selectedBotId: number | null
  setSelectedBotId: (id: number | null) => void
}

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
