import { useCallback, useContext, useEffect, useRef, type MutableRefObject, type ReactNode } from 'react'
import { createContext } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { setSessionAccessToken } from '@/lib/sessionAccessToken'
import {
  getAccessTokenRefreshDelayMs,
  shouldRefreshAccessTokenNow,
} from '@/lib/authSession'
import { getSessionAccessToken } from '@/lib/sessionAccessToken'
import { useAuthStore } from '@/stores/authStore'
import { useTRPC, useTRPCClient } from '@/lib/trpc'
import type { AuthContextType, AuthRefreshResult, AuthSessionPayload } from '@/types/app'
import type { AuthUser, AuthUserInput } from '@/types/auth'

const AuthContext = createContext<AuthContextType | null>(null)

const REFRESH_LEAD_MS = 60_000
const REFRESH_MIN_DELAY_MS = 10_000

/** Evita dois `auth.refresh` em paralelo (o segundo queimava o refresh e revogava a sessão). */
let refreshInflight: Promise<void> | null = null
const discordExchangeInflight = new Map<string, Promise<AuthSessionPayload>>()
const DISCORD_SUCCESS_CACHE_TTL_MS = 3 * 60 * 1000
const discordExchangeSuccessCache = new Map<string, { result: AuthSessionPayload; expiresAt: number }>()

export function toAuthUser(user: AuthUserInput): AuthUser {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    language: user.language,
    discordId: user.discordId,
    discordAvatar: user.discordAvatar,
    role: String(user.role),
    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.updatedAt),
  }
}

function pickProfileUser(payload: unknown): AuthUserInput | null {
  if (!payload || typeof payload !== 'object') {
    console.warn('[pickProfileUser] payload is not an object:', payload)
    return null
  }

  const payloadWithData = payload as { data?: unknown }
  const candidate = payloadWithData.data ?? payload
  if (!candidate || typeof candidate !== 'object') {
    console.warn('[pickProfileUser] candidate is not an object:', candidate)
    return null
  }

  const user = candidate as Partial<AuthUserInput>
  const id = typeof user.id === 'string' ? Number(user.id) : user.id

  if (
    typeof id !== 'number' || Number.isNaN(id)
    || typeof user.name !== 'string'
    || typeof user.username !== 'string'
    || typeof user.email !== 'string'
    || typeof user.language !== 'string'
  ) {
    console.warn('[pickProfileUser] validation failed for:', user)
    return null
  }

  return {
    ...user,
    id,
  } as AuthUserInput
}

function takeCachedDiscordSuccess(dedupeKey: string): AuthSessionPayload | undefined {
  const entry = discordExchangeSuccessCache.get(dedupeKey)
  if (entry === undefined) return undefined
  if (Date.now() > entry.expiresAt) {
    discordExchangeSuccessCache.delete(dedupeKey)
    return undefined
  }
  return entry.result
}

function dedupedDiscordExchange(
  mutateAsync: (input: { code: string; state: string; redirect_uri: string }) => Promise<AuthSessionPayload>,
  input: { code: string; state: string; redirect_uri: string },
) {
  const dedupeKey = `${input.code}\0${input.state}\0${input.redirect_uri}`
  const cached = takeCachedDiscordSuccess(dedupeKey)
  if (cached !== undefined) {
    return Promise.resolve(cached)
  }

  let pending = discordExchangeInflight.get(dedupeKey)
  if (pending === undefined) {
    pending = mutateAsync(input)
      .then((result) => {
        discordExchangeSuccessCache.set(dedupeKey, {
          result,
          expiresAt: Date.now() + DISCORD_SUCCESS_CACHE_TTL_MS,
        })
        return result
      })
      .finally(() => {
        discordExchangeInflight.delete(dedupeKey)
      })
    discordExchangeInflight.set(dedupeKey, pending)
  }

  return pending
}

function getDiscordOAuthCallbackRedirectUri(): string {
  return `${window.location.origin}/login/discord/callback`
}

function getServerOrigin(): string {
  const fromEnv = import.meta.env.VITE_SERVER_URL as string | undefined
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.replace(/\/$/, '')
  if (import.meta.env.DEV) return 'http://localhost:3500'
  return window.location.origin
}

function redirectToDiscordOAuth(): void {
  const redirect_uri = getDiscordOAuthCallbackRedirectUri()
  const serverOrigin = getServerOrigin()
  const startUrl = `${serverOrigin}/auth/discord/start?redirect_uri=${encodeURIComponent(redirect_uri)}`
  window.location.href = startUrl
}

function formatDiscordOAuthCallbackError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message: unknown }).message
    if (typeof message === 'string') return message
  }
  return 'Authentication failed'
}

function useAuthQueries(isAuthenticated: boolean) {
  const trpc = useTRPC()

  const profileQuery = useQuery(trpc.users.profile.queryOptions(undefined, {
    retry: false,
    enabled: isAuthenticated,
  }))

  const loginMutation = useMutation(trpc.auth.login.mutationOptions())
  const signupMutation = useMutation(trpc.auth.signup.mutationOptions())
  const logoutMutation = useMutation(trpc.auth.logout.mutationOptions())
  const refreshMutation = useMutation(trpc.auth.refresh.mutationOptions())
  const discordExchangeMutation = useMutation(trpc.auth.discordExchange.mutationOptions())

  return {
    profileQuery,
    loginMutation,
    signupMutation,
    logoutMutation,
    refreshMutation,
    discordExchangeMutation,
  }
}

type UseAuthActionsParams = {
  trpcClient: ReturnType<typeof useTRPCClient>
  loginMutation: ReturnType<typeof useAuthQueries>['loginMutation']
  signupMutation: ReturnType<typeof useAuthQueries>['signupMutation']
  logoutMutation: ReturnType<typeof useAuthQueries>['logoutMutation']
  setUser: (user: ReturnType<typeof toAuthUser>) => void
  clear: () => void
  armRefreshTimer: (expiresInMs: number) => void
  clearRefreshTimer: () => void
}

function useAuthActions({
  trpcClient,
  loginMutation,
  signupMutation,
  logoutMutation,
  setUser,
  clear,
  armRefreshTimer,
  clearRefreshTimer,
}: UseAuthActionsParams) {
  const applyAuthSession = useCallback(
    async (result: AuthSessionPayload) => {
      setSessionAccessToken(result.data.accessToken.token)

      const profileData = await trpcClient.users.profile.query()
      console.log('[applyAuthSession] trpcClient.users.profile.query() result:', profileData)

      const profileUser = pickProfileUser(profileData)
      if (!profileUser) {
        console.error('[applyAuthSession] pickProfileUser returned null for payload:', profileData)
        throw new Error('Could not load profile after sign-in. Try again.')
      }

      setUser(toAuthUser(profileUser))
      const expiresInSeconds = result.data.accessToken.expireSeconds
      if (typeof expiresInSeconds === 'number' && expiresInSeconds > 0) {
        armRefreshTimer(expiresInSeconds * 1000)
      }
    },
    [trpcClient, setUser, armRefreshTimer],
  )

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginMutation.mutateAsync({ email, password })
    await applyAuthSession(result)
  }, [loginMutation, applyAuthSession])

  const signup = useCallback(async (data: { name: string; username: string; email: string; language: string; password: string }) => {
    await signupMutation.mutateAsync(data)
  }, [signupMutation])

  const logout = useCallback(async () => {
    clearRefreshTimer()
    try {
      await logoutMutation.mutateAsync()
    } catch {
      // Ignore logout errors — clear state anyway
    }
    clear()
  }, [logoutMutation, clear, clearRefreshTimer])

  return {
    applyAuthSession,
    login,
    signup,
    logout,
  }
}

type UseAuthProfileStateParams = {
  profileQuery: ReturnType<typeof useAuthQueries>['profileQuery']
  isAuthenticated: boolean
  setUser: (user: ReturnType<typeof toAuthUser>) => void
  setLoading: (isLoading: boolean) => void
  clear: () => void
  performRefresh: () => Promise<void>
  isRefreshingRef: MutableRefObject<boolean>
}

function useAuthProfileState({
  profileQuery,
  isAuthenticated,
  setUser,
  setLoading,
  clear,
  performRefresh,
  isRefreshingRef,
}: UseAuthProfileStateParams) {
  const profileRecoveryErrorAtRef = useRef(0)

  useEffect(() => {
    const profileUser = pickProfileUser(profileQuery.data)
    if (profileUser) setUser(toAuthUser(profileUser))
  }, [profileQuery.data, setUser])

  useEffect(() => {
    if (!profileQuery.error || !isAuthenticated || isRefreshingRef.current) {
      return
    }

    const errorUpdatedAt = profileQuery.errorUpdatedAt
    if (errorUpdatedAt > 0 && profileRecoveryErrorAtRef.current === errorUpdatedAt) {
      return
    }

    profileRecoveryErrorAtRef.current = errorUpdatedAt
    void performRefresh().catch(() => clear())
  }, [profileQuery.error, profileQuery.errorUpdatedAt, isAuthenticated, clear, performRefresh, isRefreshingRef])

  useEffect(() => {
    if (isAuthenticated && profileQuery.isLoading) {
      setLoading(true)
    } else if (!isAuthenticated || profileQuery.isFetched) {
      setLoading(false)
    }
  }, [isAuthenticated, profileQuery.isLoading, profileQuery.isFetched, setLoading])
}

type UseAuthRefreshSchedulerParams = {
  isAuthenticated: boolean
  clear: () => void
  performRefreshRef: MutableRefObject<() => Promise<void>>
}

function useAuthRefreshScheduler({
  isAuthenticated,
  clear,
  performRefreshRef,
}: UseAuthRefreshSchedulerParams) {
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }, [])

  const scheduleLockedRefresh = useCallback((delayMs: number) => {
    clearRefreshTimer()
    refreshTimerRef.current = setTimeout(() => {
      void performRefreshRef.current().catch(() => clear())
    }, Math.max(delayMs, 0))
  }, [clear, clearRefreshTimer, performRefreshRef])

  const armRefreshTimer = useCallback((expiresInMs: number) => {
    const refreshIn = Math.max(expiresInMs - REFRESH_LEAD_MS, REFRESH_MIN_DELAY_MS)
    scheduleLockedRefresh(refreshIn)
  }, [scheduleLockedRefresh])

  useEffect(() => {
    if (!isAuthenticated) {
      clearRefreshTimer()
      return
    }

    const persistedToken = getSessionAccessToken()
    if (!persistedToken || shouldRefreshAccessTokenNow(persistedToken, REFRESH_LEAD_MS)) {
      void performRefreshRef.current().catch(() => clear())
      return
    }

    const delayMs = getAccessTokenRefreshDelayMs(persistedToken, {
      leadMs: REFRESH_LEAD_MS,
      minDelayMs: REFRESH_MIN_DELAY_MS,
    })

    if (delayMs === null) {
      void performRefreshRef.current().catch(() => clear())
      return
    }

    scheduleLockedRefresh(delayMs)
  }, [isAuthenticated, clear, clearRefreshTimer, scheduleLockedRefresh, performRefreshRef])

  useEffect(() => () => clearRefreshTimer(), [clearRefreshTimer])

  return {
    armRefreshTimer,
    clearRefreshTimer,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading, setUser, setLoading, clear } = useAuthStore()
  const isRefreshingRef = useRef(false)
  const performLockedRefreshRef = useRef<() => Promise<void>>(async () => {
    await Promise.resolve()
  })

  const {
    profileQuery,
    loginMutation,
    signupMutation,
    logoutMutation,
    refreshMutation,
    discordExchangeMutation,
  } = useAuthQueries(isAuthenticated)

  const trpcClient = useTRPCClient()

  const { armRefreshTimer, clearRefreshTimer } = useAuthRefreshScheduler({
    isAuthenticated,
    clear,
    performRefreshRef: performLockedRefreshRef,
  })

  const performLockedRefresh = useCallback((): Promise<void> => {
    if (refreshInflight !== null) {
      return refreshInflight
    }
    refreshInflight = (async () => {
      try {
        isRefreshingRef.current = true
        const result: AuthRefreshResult = await refreshMutation.mutateAsync()
        setSessionAccessToken(result.data.accessToken.token)
        await profileQuery.refetch()
        const newExpiresInMs = result.data.accessToken.expireSeconds * 1000
        armRefreshTimer(newExpiresInMs)
      } finally {
        isRefreshingRef.current = false
        refreshInflight = null
      }
    })()
    return refreshInflight
  }, [refreshMutation, profileQuery, armRefreshTimer])

  useEffect(() => {
    performLockedRefreshRef.current = performLockedRefresh
  }, [performLockedRefresh])

  useAuthProfileState({
    profileQuery,
    isAuthenticated,
    setUser,
    setLoading,
    clear,
    performRefresh: () => performLockedRefreshRef.current(),
    isRefreshingRef,
  })

  const { applyAuthSession, login, signup, logout } = useAuthActions({
    trpcClient,
    loginMutation,
    signupMutation,
    logoutMutation,
    setUser,
    clear,
    armRefreshTimer,
    clearRefreshTimer,
  })

  const startDiscordSignIn = useCallback(() => {
    redirectToDiscordOAuth()
  }, [])

  const completeDiscordSignIn = useCallback(async (input: { code: string; state: string; redirectUri: string }) => {
    const result = await dedupedDiscordExchange(discordExchangeMutation.mutateAsync, {
      code: input.code,
      state: input.state,
      redirect_uri: input.redirectUri,
    })
    await applyAuthSession(result)
  }, [discordExchangeMutation.mutateAsync, applyAuthSession])

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated,
      login,
      applyAuthSession,
      startDiscordSignIn,
      completeDiscordSignIn,
      getDiscordCallbackRedirectUri: getDiscordOAuthCallbackRedirectUri,
      formatDiscordOAuthCallbackError,
      signup,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
