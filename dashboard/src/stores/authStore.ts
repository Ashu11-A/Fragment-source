import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { clearSessionAccessToken } from '@/lib/sessionAccessToken'
import type { AuthState } from '@/types/stores'

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) =>
        set({ user, isAuthenticated: !!user, isLoading: false }),

      setLoading: (isLoading) => set({ isLoading }),

      clear: () => {
        clearSessionAccessToken()
        set({ user: null, isAuthenticated: false, isLoading: false })
      },
    }),
    {
      name: 'fragment-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
)
