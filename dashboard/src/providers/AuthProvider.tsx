import { createContext, useContext, useCallback, useEffect, useRef, type ReactNode } from 'react'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from 'server'
import { setSessionAccessToken } from '@/lib/sessionAccessToken'
import type { AuthSessionPayload } from '@/lib/authSession'
import { trpc } from '@/lib/trpc'
import { useAuthStore, type AuthUser } from '@/stores/authStore'

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  applyAuthSession: (result: AuthSessionPayload) => Promise<void>
  signup: (data: { name: string; username: string; email: string; language: string; password: string }) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

type AuthRefreshResult = inferRouterOutputs<AppRouter>['auth']['refresh']

/** Evita dois `auth.refresh` em paralelo (o segundo queimava o refresh e revogava a sessão). */
let refreshInflight: Promise<void> | null = null

const REFRESH_LEAD_MS = 60_000
const REFRESH_MIN_DELAY_MS = 10_000

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading, setUser, setLoading, clear } = useAuthStore()
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isRefreshingRef = useRef(false)
  const performLockedRefreshRef = useRef<() => Promise<void>>(async () => {
    await Promise.resolve()
  })
  const trpcUtils = trpc.useUtils()

  /**
   * Profile query only fires when there's a persisted session (isAuthenticated
   * from localStorage) to avoid an UNAUTHORIZED error on first visit to /login.
   * After a successful login() call we update the store synchronously, so this
   * becomes enabled automatically on the next render.
   */
  const profileQuery = trpc.users.profile.useQuery(undefined, {
    retry: false,
    enabled: isAuthenticated,
  })

  // Sync profile data to auth store when query succeeds
  useEffect(() => {
    if (profileQuery.data) {
      const data = profileQuery.data.data
      setUser({
        id: data.id,
        uuid: data.uuid,
        name: data.name,
        username: data.username,
        email: data.email,
        role: String(data.role),
      })
    }
  }, [profileQuery.data, setUser])

  // Handle profile errors — session expired or cookie invalid (não limpar durante refresh)
  useEffect(() => {
    if (profileQuery.error && isAuthenticated && !isRefreshingRef.current) {
      clear()
    }
  }, [profileQuery.error, isAuthenticated, clear])

  // Loading state: loading if we have a persisted session but haven't verified yet
  useEffect(() => {
    if (isAuthenticated && profileQuery.isLoading) {
      setLoading(true)
    } else if (!isAuthenticated || profileQuery.isFetched) {
      setLoading(false)
    }
  }, [isAuthenticated, profileQuery.isLoading, profileQuery.isFetched, setLoading])

  const loginMutation = trpc.auth.login.useMutation()
  const signupMutation = trpc.auth.signup.useMutation()
  const logoutMutation = trpc.auth.logout.useMutation()
  const refreshMutation = trpc.auth.refresh.useMutation()

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }, [])

  const armRefreshTimer = useCallback(
    (expiresInMs: number) => {
      clearRefreshTimer()
      const refreshIn = Math.max(expiresInMs - REFRESH_LEAD_MS, REFRESH_MIN_DELAY_MS)
      refreshTimerRef.current = setTimeout(() => {
        void performLockedRefreshRef.current().catch(() => {
          clear()
        })
      }, refreshIn)
    },
    [clear, clearRefreshTimer],
  )

  const performLockedRefresh = useCallback((): Promise<void> => {
    if (refreshInflight !== null) {
      return refreshInflight
    }
    refreshInflight = (async () => {
      try {
        isRefreshingRef.current = true
        const result: AuthRefreshResult = await refreshMutation.mutateAsync()
        setSessionAccessToken(result.data.accessToken.token)
        // Rotação invalida o access antigo na API; refetch imediato evita profile em batch com Bearer velho.
        await trpcUtils.users.profile.refetch()
        const newExpiresInMs = result.data.accessToken.expireSeconds * 1000
        armRefreshTimer(newExpiresInMs)
      } finally {
        isRefreshingRef.current = false
        refreshInflight = null
      }
    })()
    return refreshInflight
  }, [refreshMutation, trpcUtils.users.profile, armRefreshTimer])

  useEffect(() => {
    performLockedRefreshRef.current = performLockedRefresh
  }, [performLockedRefresh])

  // Cleanup refresh timer on unmount
  useEffect(() => {
    return () => {
      clearRefreshTimer()
    }
  }, [clearRefreshTimer])

  const applyAuthSession = useCallback(
    async (result: AuthSessionPayload) => {
      setSessionAccessToken(result.data.accessToken.token)

      const profileData = await trpcUtils.users.profile.fetch(undefined)
      if (!profileData?.data) {
        throw new Error('Could not load profile after sign-in. Try again.')
      }
      const profileUser = profileData.data
      setUser({
        id: profileUser.id,
        uuid: profileUser.uuid,
        name: profileUser.name,
        username: profileUser.username,
        email: profileUser.email,
        role: String(profileUser.role),
      })

      const expiresInSeconds = result.data.accessToken.expireSeconds
      if (typeof expiresInSeconds === 'number' && expiresInSeconds > 0) {
        armRefreshTimer(expiresInSeconds * 1000)
      }

      void trpcUtils.users.profile.invalidate()
    },
    [trpcUtils, armRefreshTimer, setUser],
  )

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await loginMutation.mutateAsync({ email, password })
      await applyAuthSession(result)
    },
    [loginMutation, applyAuthSession],
  )

  const signup = useCallback(
    async (data: { name: string; username: string; email: string; language: string; password: string }) => {
      await signupMutation.mutateAsync(data)
    },
    [signupMutation],
  )

  const logout = useCallback(async () => {
    clearRefreshTimer()
    try {
      await logoutMutation.mutateAsync()
    } catch {
      // Ignore logout errors — clear state anyway
    }
    clear()
  }, [logoutMutation, clear, clearRefreshTimer])

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated, login, applyAuthSession, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
