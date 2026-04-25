import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { clearSessionAccessToken } from '@/lib/sessionAccessToken'

export interface AuthUser {
  id: number
  uuid: string
  name: string
  username: string
  email: string
  role: string
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean

  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  clear: () => void
}

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
