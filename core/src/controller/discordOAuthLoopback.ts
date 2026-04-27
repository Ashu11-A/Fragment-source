import { trpc, setAccessToken, setRefreshToken } from '@/singletons.js'
import { storage } from '@/storage.js'
import { OAuthLoopback } from 'discord-oauth/loopback'

function getPublicApiBase(): string {
  return process.env.FRAGMENT_API_PUBLIC_URL?.trim() || 'http://127.0.0.1:3500'
}

export async function runDiscordOAuthLoopback(): Promise<void> {
  const port = OAuthLoopback.port()
  const redirect_uri = `http://127.0.0.1:${port}/callback`
  const startUrl = `${getPublicApiBase()}/auth/discord/start?redirect_uri=${encodeURIComponent(redirect_uri)}`

  await new OAuthLoopback().run({
    port,
    startUrl,
    async onCallback({ code, state }) {
      const result = await trpc.auth.discordExchange.mutate({ code, state, redirect_uri })
      setAccessToken(result.data.accessToken.token)
      setRefreshToken(result.data.refreshToken.token)
      await storage.append('.data', {
        accessToken: result.data.accessToken,
        refreshToken: result.data.refreshToken,
      }, { isJson: true })
    },
  })
}
