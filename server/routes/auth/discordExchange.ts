import { TRPCError } from '@trpc/server'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { publicProcedure } from '@/trpc.js'
import { User } from '@/database/entity/User.js'
import { Role } from '@/database/enums.js'
import { issueAuthSession } from '@/security/session.js'
import { discord } from '@/services/Discord.js'
import { toTrpcError } from '../_shared/errors.js'

const discordExchangeSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
})

function buildSafeUsername(candidate: string): string {
  const base = candidate
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return base.length >= 3 ? base.slice(0, 32) : `discord-${randomUUID().slice(0, 8)}`
}

export const discordExchangeProcedure = publicProcedure
  .input(discordExchangeSchema)
  .mutation(async ({ input, ctx }) => {
    try {
      const statePayload = discord.verifyState(input.state)
      discord.assertRedirectUri(statePayload.redirect_uri)

      const tokenResponse = await discord.exchangeCode(input.code, statePayload.redirect_uri)
      const discordUser = await discord.fetchUser(tokenResponse.access_token)

      if (!discordUser.id || !discordUser.email) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Discord account does not provide required identity fields.',
        })
      }

      let user = await User.findOne({ where: { discordId: discordUser.id } })

      if (!user) {
        user = await User.findOne({ where: { email: discordUser.email.toLowerCase() } })
      }

      if (!user) {
        const preferredName = discordUser.global_name?.trim() || discordUser.username?.trim() || 'Discord User'
        const preferredUsername = buildSafeUsername(discordUser.username || preferredName)

        let username = preferredUsername
        for (let attempts = 0; attempts < 5; attempts += 1) {
          const existing = await User.findOne({ where: { username } })
          if (!existing) break
          username = `${preferredUsername}-${Math.floor(1000 + Math.random() * 9000)}`
        }

        user = User.create({
          name: preferredName,
          username,
          email: discordUser.email.toLowerCase(),
          language: 'pt-BR',
          role: Role.User,
          password: null,
        })
      }

      user.discordId = discordUser.id
      user.discordAvatar = discordUser.avatar ?? null
      await user.save()

      return issueAuthSession(user, ctx.res, ctx.req)
    } catch (error) {
      throw toTrpcError(error, 'Could not complete Discord authentication')
    }
  })
