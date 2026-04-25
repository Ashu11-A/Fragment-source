import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'dark' | 'light'

interface UIState {
  theme: Theme
  sidebarCollapsed: boolean
  searchQuery: string

  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleSidebar: () => void
  setSearchQuery: (query: string) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'dark',
      sidebarCollapsed: false,
      searchQuery: '',

      setTheme: (theme) => {
        document.documentElement.classList.remove('light', 'dark')
        document.documentElement.classList.add(theme)
        set({ theme })
      },

      toggleTheme: () =>
        set((state) => {
          const next = state.theme === 'dark' ? 'light' : 'dark'
          document.documentElement.classList.remove('light', 'dark')
          document.documentElement.classList.add(next)
          return { theme: next }
        }),

      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
    }),
    {
      name: 'fragment-ui',
      partialize: (state) => ({ theme: state.theme, sidebarCollapsed: state.sidebarCollapsed }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.classList.remove('light', 'dark')
          document.documentElement.classList.add(state.theme)
        }
      },
    },
  ),
)
