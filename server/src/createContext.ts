import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify'
import { BearerStrategy } from '@/security/strategies/BearerStrategy.js'
import { CookiesStrategy } from '@/security/strategies/CookiesStrategy.js'
import type { Context } from '@/types/trpc.js'

export async function createContext({ req, res }: CreateFastifyContextOptions): Promise<Context> {
  for (const Strategy of [BearerStrategy, CookiesStrategy]) {
    const s = new Strategy()
    await s.validation(req)
    if (s.authenticated && s.data) return { user: s.data, req, res }
  }
  return { user: null, req, res }
}
