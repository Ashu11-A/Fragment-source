import { useEffect, useRef, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ErrorAlert } from '@/components/ErrorAlert'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { useDiscordAuth } from '@/hooks/useDiscordAuth'
import { useAuth } from '@/providers/AuthProvider'
import { trpc } from '@/lib/trpc'

type CallbackSearch = {
  code?: string
  state?: string
  error?: string
  error_description?: string
}

export const Route = createFileRoute('/login/discord/callback')({
  validateSearch: (search: Record<string, unknown>): CallbackSearch => ({
    code: typeof search.code === 'string' ? search.code : undefined,
    state: typeof search.state === 'string' ? search.state : undefined,
    error: typeof search.error === 'string' ? search.error : undefined,
    error_description: typeof search.error_description === 'string' ? search.error_description : undefined,
  }),
  component: DiscordOAuthCallbackPage,
})

function DiscordOAuthCallbackPage () {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const { applyAuthSession } = useAuth()
  const { dedupedExchange, formatCallbackError, getCallbackRedirectUri } = useDiscordAuth()
  const [localError, setLocalError] = useState('')

  const { mutateAsync: exchangeDiscord } = trpc.auth.discordExchange.useMutation()
  // mutateAsync muda de referência entre renders e re-dispara o efeito com o mesmo `code` na URL → segundo exchange → invalid_grant.
  const exchangeDiscordRef = useRef(exchangeDiscord)
  exchangeDiscordRef.current = exchangeDiscord

  useEffect(() => {
    if (search.error) {
      setLocalError(search.error_description ?? search.error ?? 'Discord authorization was cancelled or failed.')
      return
    }
    if (!search.code || !search.state) {
      setLocalError('Missing authorization code. Try signing in again.')
      return
    }

    const oauthCode = search.code
    const oauthState = search.state
    const redirect_uri = getCallbackRedirectUri()
    let cancelled = false

    void (async () => {
      try {
        const result = await dedupedExchange(exchangeDiscordRef.current, {
          code: oauthCode,
          state: oauthState,
          redirect_uri,
        })
        if (cancelled) return
        await applyAuthSession(result)
        if (cancelled) return
        navigate({ to: '/', replace: true })
      } catch (err) {
        if (cancelled) return
        setLocalError(formatCallbackError(err))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [search.code, search.state, search.error, search.error_description, applyAuthSession, navigate, dedupedExchange, formatCallbackError, getCallbackRedirectUri])

  if (localError) {
    return (
      <div className="ui-app-screen min-h-screen flex flex-col items-center justify-center gap-4 p-4">
        <ErrorAlert error={localError} />
        <button
          type="button"
          className="text-sm text-blurple-400 hover:text-blurple-300"
          onClick={() => navigate({ to: '/login' })}
        >
          Back to login
        </button>
      </div>
    )
  }

  return (
    <div className="ui-app-screen min-h-screen flex flex-col items-center justify-center gap-3 p-4">
      <LoadingSpinner />
      <p className="text-surface-400 text-sm">Completing Discord sign-in…</p>
    </div>
  )
}
