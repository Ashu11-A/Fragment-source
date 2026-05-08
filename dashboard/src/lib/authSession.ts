type JwtPayload = {
  exp?: unknown
}

export type AccessTokenRefreshScheduleOptions = {
  leadMs: number
  minDelayMs: number
  nowMs?: number
}

function decodeBase64Url(base64Url: string): string | null {
  const normalized = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  const padding = (4 - (normalized.length % 4)) % 4
  const padded = `${normalized}${'='.repeat(padding)}`

  if (typeof atob !== 'function') {
    return null
  }

  try {
    return atob(padded)
  } catch {
    return null
  }
}

function parseJwtPayload(token: string): JwtPayload | null {
  const parts = token.split('.')
  if (parts.length < 2) return null

  const decoded = decodeBase64Url(parts[1])
  if (decoded === null) return null

  try {
    return JSON.parse(decoded) as JwtPayload
  } catch {
    return null
  }
}

export function getAccessTokenExpiresAtMs(token: string): number | null {
  const payload = parseJwtPayload(token)
  if (!payload || typeof payload.exp !== 'number' || !Number.isFinite(payload.exp) || payload.exp <= 0) {
    return null
  }

  return payload.exp * 1000
}

export function getAccessTokenRemainingMs(token: string, nowMs: number = Date.now()): number | null {
  const expiresAtMs = getAccessTokenExpiresAtMs(token)
  if (expiresAtMs === null) return null
  return expiresAtMs - nowMs
}

export function shouldRefreshAccessTokenNow(token: string, leadMs: number, nowMs: number = Date.now()): boolean {
  const remainingMs = getAccessTokenRemainingMs(token, nowMs)
  if (remainingMs === null) return true
  return remainingMs <= leadMs
}

export function getAccessTokenRefreshDelayMs(
  token: string,
  options: AccessTokenRefreshScheduleOptions,
): number | null {
  const remainingMs = getAccessTokenRemainingMs(token, options.nowMs)
  if (remainingMs === null) return null

  if (remainingMs <= options.leadMs) return 0

  return Math.max(remainingMs - options.leadMs, options.minDelayMs)
}
