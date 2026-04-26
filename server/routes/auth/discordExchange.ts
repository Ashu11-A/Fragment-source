import { TRPCError } from '@trpc/server'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { User } from '@/database/entity/User.js'
import { Role } from '@/database/enums.js'
import { issueAuthSession } from '@/security/session.js'
import {
  assertRedirectUriAllowed,
  exchangeDiscordCode,
  fetchDiscordUserMe,
  verifyDiscordOAuthState,
  type DiscordUserMe,
} from '@/services/discordOAuth.js'
import { publicProcedure } from '@/trpc.js'

async function findOrCreateUserFromDiscord(discord: DiscordUserMe): Promise<User> {
  const existingByDiscord = await User.findOne({ where: { discordId: discord.id } })
  if (existingByDiscord) return existingByDiscord

  const nameSource = discord.global_name || discord.username
  const name = nameSource.slice(0, 64)
  const username = `dsc_${discord.id}`.slice(0, 64)

  let email: string
  if (discord.email && discord.verified) {
    email = discord.email
    const taken = await User.findOneBy({ email })
    if (taken) email = `discord-${discord.id}@users.fragment.local`
  } else {
    email = `discord-${discord.id}@users.fragment.local`
  }

  const user = User.create({
    uuid: nanoid(),
    name,
    username,
    email,
    language: 'en',
    role: Role.User,
    discordId: discord.id,
    password: null,
  })
  await user.save()
  return user
}

export const discordExchange = publicProcedure
  .input(z.object({
    code: z.string().min(1),
    state: z.string().min(1),
    redirect_uri: z.string().min(1),
  }))
  .mutation(async ({ input, ctx }) => {
    const payload = verifyDiscordOAuthState(input.state)
    const canonicalRedirect = payload.redirect_uri.trim()
    if (canonicalRedirect !== input.redirect_uri.trim()) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'redirect_uri does not match state' })
    }
    assertRedirectUriAllowed(canonicalRedirect)

    // Usar sempre o redirect do JWT (o mesmo do /authorize) para bater byte-a-byte com o Discord.
    const tokenData = await exchangeDiscordCode(input.code.trim(), canonicalRedirect)
    const discordUser = await fetchDiscordUserMe(tokenData.access_token)
    const user = await findOrCreateUserFromDiscord(discordUser)

    return await issueAuthSession(user, ctx.res)
  })
