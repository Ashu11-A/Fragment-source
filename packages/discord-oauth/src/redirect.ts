export function isLoopbackUri(redirectUri: string): boolean {
  try {
    const { protocol, hostname, pathname } = new URL(redirectUri)
    if (protocol !== 'http:') return false
    if (hostname !== '127.0.0.1' && hostname !== 'localhost' && hostname !== '[::1]') return false
    if (pathname !== '/callback') return false
    return true
  } catch {
    return false
  }
}

export function getAllowedRedirectUris(): string[] {
  const list: string[] = []

  const raw = (process.env.DISCORD_ALLOWED_REDIRECT_URIS ?? '').trim()
  if (raw.length > 0) {
    list.push(...raw.split(',').map((s) => s.trim()).filter((s) => s.length > 0))
  }

  const frontEndUrl = process.env.FRONT_END_URL?.trim()
  if (frontEndUrl) {
    try {
      const origin = new URL(frontEndUrl).origin
      list.push(`${origin}/login/discord/callback`)
    } catch { /* invalid FRONT_END_URL — ignore */ }
  }

  return [...new Set(list)]
}

export function assertRedirectUri(redirectUri: string): void {
  // RFC 8252 §7.3: loopback URIs are always allowed on any port for CLI/native apps.
  if (isLoopbackUri(redirectUri)) return

  const allowed = getAllowedRedirectUris()
  if (!allowed.includes(redirectUri)) {
    throw new Error('redirect_uri is not allowed')
  }
}
