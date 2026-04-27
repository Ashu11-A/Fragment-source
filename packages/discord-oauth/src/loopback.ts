const TIMEOUT_MS = 5 * 60_000

function openBrowser(url: string): void {
  const platform = process.platform
  const args =
    platform === 'darwin' ? ['open', url] as const
      : platform === 'win32' ? ['cmd', '/c', 'start', '""', url] as const
        : ['xdg-open', url] as const
  try {
    Bun.spawn([...args], { stdout: 'ignore', stderr: 'ignore' })
  } catch (e) {
    console.warn(`Could not open browser automatically: ${e instanceof Error ? e.message : String(e)}`)
    console.info(`Open this URL to sign in:\n${url}\n`)
  }
}

export type LoopbackCallbackParams = {
  code: string
  state: string
  redirect_uri: string
}

export type LoopbackOptions = {
  /** Port to listen on. Defaults to env FRAGMENT_CLI_OAUTH_PORT or 9786. */
  port?: number
  /** Opened in the user's browser to start the OAuth flow. */
  startUrl: string
  /** Called when Discord redirects back with a code. Should exchange tokens and resolve. */
  onCallback(params: LoopbackCallbackParams): Promise<void>
}

export class OAuthLoopback {
  static port(): number {
    const port = Number(process.env.FRAGMENT_CLI_OAUTH_PORT ?? 9786)
    return Number.isFinite(port) && port > 0 ? port : 9786
  }

  async run({ port, startUrl, onCallback }: LoopbackOptions): Promise<void> {
    const listenPort = port ?? OAuthLoopback.port()
    const redirect_uri = `http://127.0.0.1:${listenPort}/callback`

    await new Promise<void>((resolve, reject) => {
      const state: { server?: ReturnType<typeof Bun.serve> } = {}

      const timeout = setTimeout(() => {
        try { state.server?.stop() } catch { /* */ }
        reject(new Error('Discord sign-in timed out. Try again.'))
      }, TIMEOUT_MS)

      const finish = (error?: unknown) => {
        clearTimeout(timeout)
        try { state.server?.stop() } catch { /* */ }
        if (error !== undefined) reject(error instanceof Error ? error : new Error(String(error)))
        else resolve()
      }

      state.server = Bun.serve({
        hostname: '127.0.0.1',
        port: listenPort,
        async fetch(req) {
          const url = new URL(req.url)
          if (url.pathname !== '/callback') return new Response('Not found', { status: 404 })

          const oauthError = url.searchParams.get('error')
          if (oauthError) {
            finish(new Error(url.searchParams.get('error_description') || oauthError))
            return new Response(
              '<!DOCTYPE html><html><body><p>Authorization failed. You can close this window.</p></body></html>',
              { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
            )
          }

          const code = url.searchParams.get('code')
          const stateParam = url.searchParams.get('state')
          if (!code || !stateParam) {
            finish(new Error('Missing OAuth code or state.'))
            return new Response('Bad request', { status: 400 })
          }

          try {
            await onCallback({ code, state: stateParam, redirect_uri })
            finish()
            return new Response(
              '<!DOCTYPE html><html><body><p>Signed in successfully. You can close this window and return to the terminal.</p></body></html>',
              { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
            )
          } catch (e) {
            finish(e)
            return new Response(
              '<!DOCTYPE html><html><body><p>Sign-in failed. You can close this window.</p></body></html>',
              { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
            )
          }
        },
      })

      openBrowser(startUrl)
    })
  }
}
