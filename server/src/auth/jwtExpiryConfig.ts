import { timer } from '../utils/timer.js'

/** Duração em ms (alinhada a datas de cookie e ao payload `expireSeconds` em segundos). */
export function resolveAccessExpireMs (): number {
  return timer.number(process.env.JWT_EXPIRE ?? '7d') as number
}

export function resolveRefreshExpireMs (): number {
  return timer.number(process.env.REFRESH_EXPIRE ?? '7d') as number
}

/** Segundos para o JSON da API; o cliente multiplica por 1000 para agendar refresh. */
export function payloadExpireSeconds (expiresMs: number): number {
  return Math.max(1, Math.floor(expiresMs / 1000))
}

/**
 * Segundos para `jwt.sign({ expiresIn })` — a API jsonwebtoken tipa número como segundos.
 */
export function jwtSignExpiresInSeconds (expiresMs: number): number {
  return payloadExpireSeconds(expiresMs)
}
