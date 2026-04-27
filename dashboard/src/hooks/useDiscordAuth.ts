import { useCallback } from 'react'
import type { DiscordExchangeResult } from '@/types/app'

/** Discord devolve um `code` de uso único; Strict Mode / deps instáveis podem reexecutar o efeito após o primeiro exchange e gerar `invalid_grant`. */
const discordExchangeInflight = new Map<string, Promise<DiscordExchangeResult>>()

const SUCCESS_CACHE_TTL_MS = 3 * 60 * 1000
const discordExchangeSuccessCache = new Map<string, { result: DiscordExchangeResult; expiresAt: number }>()

function takeCachedSuccess (dedupeKey: string): DiscordExchangeResult | undefined {
  const entry = discordExchangeSuccessCache.get(dedupeKey)
  if (entry === undefined) return undefined
  if (Date.now() > entry.expiresAt) {
    discordExchangeSuccessCache.delete(dedupeKey)
    return undefined
  }
  return entry.result
}

export function dedupedDiscordExchange (
  mutateAsync: (input: { code: string; state: string; redirect_uri: string }) => Promise<DiscordExchangeResult>,
  input: { code: string; state: string; redirect_uri: string },
): Promise<DiscordExchangeResult> {
  const dedupeKey = `${input.code}\0${input.state}\0${input.redirect_uri}`

  const cached = takeCachedSuccess(dedupeKey)
  if (cached !== undefined) {
    return Promise.resolve(cached)
  }

  let pending = discordExchangeInflight.get(dedupeKey)
  if (pending === undefined) {
    pending = mutateAsync(input)
      .then((result) => {
        discordExchangeSuccessCache.set(dedupeKey, {
          result,
          expiresAt: Date.now() + SUCCESS_CACHE_TTL_MS,
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

export function getDiscordOAuthCallbackRedirectUri (): string {
  return `${window.location.origin}/login/discord/callback`
}

export function redirectToDiscordOAuth (): void {
  const redirect_uri = getDiscordOAuthCallbackRedirectUri()
  const startPath = `/auth/discord/start?redirect_uri=${encodeURIComponent(redirect_uri)}`
  window.location.href = startPath
}

export function formatDiscordOAuthCallbackError (error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message: unknown }).message
    if (typeof message === 'string') return message
  }
  return 'Authentication failed'
}

/** Ponto único para ações OAuth no cliente (evita lógica espalhada em páginas). */
export function useDiscordAuth () {
  const startSignIn = useCallback(() => {
    redirectToDiscordOAuth()
  }, [])

  return {
    startSignIn,
    getCallbackRedirectUri: getDiscordOAuthCallbackRedirectUri,
    dedupedExchange: dedupedDiscordExchange,
    formatCallbackError: formatDiscordOAuthCallbackError,
  }
}
