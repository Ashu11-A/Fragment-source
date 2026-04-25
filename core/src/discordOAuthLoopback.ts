import { trpc, setAccessToken } from '@/index.js'
import { storage, type DataCrypted } from '@/storage'
import { log } from '@/ui.js'

const OAUTH_TIMEOUT_MS = 5 * 60_000

function getPublicApiBase (): string {
  return process.env.FRAGMENT_API_PUBLIC_URL?.trim() || 'http://127.0.0.1:3500'
}

function getLoopbackPort (): number {
  const n = Number(process.env.FRAGMENT_CLI_OAUTH_PORT ?? 9786)
  return Number.isFinite(n) && n > 0 ? n : 9786
}

function openBrowser (url: string): void {
  const platform = process.platform
  const args =
    platform === 'darwin' ? ['open', url] as const
      : platform === 'win32' ? ['cmd', '/c', 'start', '""', url] as const
        : ['xdg-open', url] as const
  try {
    Bun.spawn([...args], { stdout: 'ignore', stderr: 'ignore' })
  } catch (e) {
    log.warn(`Could not open browser automatically: ${e instanceof Error ? e.message : String(e)}`)
    log.info(`Open this URL to sign in:\n${url}\n`)
  }
}

async function mergeData (partial: Partial<DataCrypted>): Promise<void> {
  const cur = (await storage.load('.data', { isJson: true })) ?? {}
  await storage.append('.data', { ...cur, ...partial } as DataCrypted, { isJson: true })
}

/**
 * Inicia um servidor HTTP em loopback, abre o navegador no fluxo Discord OAuth da API
 * e persiste access/refresh tokens em `.data`.
 */
export async function runDiscordOAuthLoopback (): Promise<void> {
  const port = getLoopbackPort()
  const redirect_uri = `http://127.0.0.1:${port}/callback`
  const startUrl = `${getPublicApiBase()}/auth/discord/start?redirect_uri=${encodeURIComponent(redirect_uri)}`

  await new Promise<void>((resolve, reject) => {
    let server!: ReturnType<typeof Bun.serve>

    const timeout = setTimeout(() => {
      try {
        server.stop()
      } catch { /* */ }
      reject(new Error('Discord sign-in timed out. Try again.'))
    }, OAUTH_TIMEOUT_MS)

    server = Bun.serve({
      hostname: '127.0.0.1',
      port,
      async fetch (req) {
        const u = new URL(req.url)
        if (u.pathname !== '/callback') {
          return new Response('Not found', { status: 404 })
        }

        const err = u.searchParams.get('error')
        const errDesc = u.searchParams.get('error_description')
        if (err) {
          clearTimeout(timeout)
          try {
            server.stop()
          } catch { /* */ }
          reject(new Error(errDesc || err))
          return new Response(
            `<!DOCTYPE html><html><body><p>Authorization failed. You can close this window.</p></body></html>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
          )
        }

        const code = u.searchParams.get('code')
        const state = u.searchParams.get('state')
        if (!code || !state) {
          clearTimeout(timeout)
          try {
            server.stop()
          } catch { /* */ }
          reject(new Error('Missing OAuth code or state.'))
          return new Response('Bad request', { status: 400 })
        }

        try {
          const result = await trpc.auth.discordExchange.mutate({
            code,
            state,
            redirect_uri,
          })
          setAccessToken(result.data.accessToken.token)
          await mergeData({
            accessToken: result.data.accessToken,
            refreshToken: result.data.refreshToken,
          })
          clearTimeout(timeout)
          try {
            server.stop()
          } catch { /* */ }
          resolve()
          return new Response(
            `<!DOCTYPE html><html><body><p>Signed in successfully. You can close this window and return to the terminal.</p></body></html>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
          )
        } catch (e) {
          clearTimeout(timeout)
          try {
            server.stop()
          } catch { /* */ }
          reject(e instanceof Error ? e : new Error(String(e)))
          return new Response(
            `<!DOCTYPE html><html><body><p>Sign-in failed. You can close this window.</p></body></html>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
          )
        }
      },
    })

    openBrowser(startUrl)
  })
}
