import { TRPCError } from '@trpc/server'
import jwt from 'jsonwebtoken'
import moment from 'moment'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { getCookieOptions, issueAuthSession } from '../auth/session.js'
import { readRefreshTokenFromRequest } from '../auth/readRefreshToken.js'
import { Auth } from '../database/entity/Auth.js'
import { User } from '../database/entity/User.js'
import { authTreeRepository, repository } from '../database/index.js'
import { Role } from '../database/enums.js'
import {
  assertRedirectUriAllowed,
  exchangeDiscordCode,
  fetchDiscordUserMe,
  verifyDiscordOAuthState,
  type DiscordUserMe,
} from '../services/discordOAuth.js'
import type { JWTData } from '../types/jwt.js'
import {
  jwtSignExpiresInSeconds,
  payloadExpireSeconds,
  resolveAccessExpireMs,
  resolveRefreshExpireMs,
} from '../auth/jwtExpiryConfig.js'
import { publicProcedure, protectedProcedure, router } from '../trpc.js'

async function findOrCreateUserFromDiscord (discord: DiscordUserMe): Promise<User> {
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

export const authRouter = router({
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(8),
    }))
    .mutation(async ({ input, ctx }) => {
      const user = await repository.user
        .createQueryBuilder('user')
        .addSelect('user.password')
        .where('user.email = :email', { email: input.email })
        .getOne()
      if (!user) throw new TRPCError({ code: 'FORBIDDEN', message: 'Invalid email or password' })

      if (user.password == null) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This account uses Discord sign-in. Please log in with Discord.',
        })
      }

      const valid = await user.validatePassword(input.password)
      if (!valid) throw new TRPCError({ code: 'FORBIDDEN', message: 'Invalid email or password' })

      return await issueAuthSession(user, ctx.res)
    }),

  discordExchange: publicProcedure
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
    }),

  signup: publicProcedure
    .input(z.object({
      name: z.string().min(4).max(64),
      username: z.string().min(4).max(64),
      email: z.string().email(),
      language: z.string(),
      password: z.string().min(8).max(30),
    }))
    .mutation(async ({ input }) => {
      const existUser = await User.findOneBy({ email: input.email })
      if (existUser) throw new TRPCError({
        code: 'CONFLICT',
        message: 'A user with the provided email or username already exists. Please use different credentials.',
      })

      const user = await (await User.create({
        ...input,
        uuid: nanoid(),
        role: Role.User,
        discordId: null,
      }).setPassword(input.password)).save()

      return {
        message: 'User registered successfully!',
        data: { id: user.id, name: user.name, username: user.username, email: user.email },
      }
    }),

  logout: protectedProcedure
    .mutation(async ({ ctx }) => {
      const token = ctx.req.headers['authorization'] ?? ctx.req.cookies?.['Bearer']
      if (!token) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Token not provided' })

      const auth = await authTreeRepository.findOne({ where: { accessToken: token } })
      if (!auth) throw new TRPCError({ code: 'NOT_FOUND', message: 'Auth not found' })

      const ancestors = await authTreeRepository.findAncestors(auth)
      const descendants = await authTreeRepository.findDescendants(auth)
      const nodesToRemove = [...descendants, ...ancestors]

      await authTreeRepository.remove(nodesToRemove)
      await auth.remove()

      return { message: 'Logout successful, tokens removed.' }
    }),

  refresh: publicProcedure
    .mutation(async ({ ctx }) => {
      const refreshSecret = process.env.REFRESH_TOKEN
      if (!refreshSecret) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'REFRESH_TOKEN is undefined!' })

      const tokenSecret = process.env.JWT_TOKEN
      if (!tokenSecret) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'JWT_TOKEN is undefined!' })

      const refreshTokenCookie = readRefreshTokenFromRequest(ctx.req)
      if (refreshTokenCookie === undefined || refreshTokenCookie.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Refresh token cookie is undefined' })
      }

      const auth = await Auth.findOne({ where: { refreshToken: refreshTokenCookie } })
      if (!auth) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Authentication not found' })

      if (!auth.valid) {
        const ancestors = await authTreeRepository.findAncestors(auth)
        const descendants = await authTreeRepository.findDescendants(auth)
        const nodesToRemove = [...descendants, ...ancestors]
        await authTreeRepository.remove(nodesToRemove)
        await auth.remove()
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'This token has already been used and all others will now be revoked!',
        })
      }

      let userData: JWTData
      try {
        userData = jwt.verify(refreshTokenCookie, refreshSecret, { algorithms: ['HS512'] }) as JWTData
      } catch {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid or expired refresh token' })
      }
      delete userData.exp
      delete userData.iat

      const expiresTokenMs = resolveAccessExpireMs()
      const expiresRefreshMs = resolveRefreshExpireMs()

      const expirationTokenDate = new Date(Date.now() + expiresTokenMs)
      const expirationRefreshDate = new Date(Date.now() + expiresRefreshMs)

      const newAccessToken = jwt.sign(userData, tokenSecret, {
        expiresIn: jwtSignExpiresInSeconds(expiresTokenMs),
        algorithm: 'HS512',
      })
      const newRefreshToken = jwt.sign(userData, refreshSecret, {
        expiresIn: jwtSignExpiresInSeconds(expiresRefreshMs),
        algorithm: 'HS512',
      })

      await Auth.create({
        parent: auth,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expireAt: moment(expirationRefreshDate.toISOString()).format('YYYY-MM-DD HH:mm:ss.SSS'),
        user: { id: userData.id },
      }).save()

      auth.valid = false
      await auth.save()

      ctx.res.setCookie('Bearer', newAccessToken, getCookieOptions(expirationTokenDate))
      ctx.res.setCookie('Refresh', newRefreshToken, getCookieOptions(expirationRefreshDate))

      return {
        message: 'Token refreshed successfully',
        data: {
          accessToken: {
            token: newAccessToken,
            expireDate: expirationTokenDate,
            expireSeconds: payloadExpireSeconds(expiresTokenMs),
          },
          refreshToken: {
            token: newRefreshToken,
            expireDate: expirationRefreshDate,
            expireSeconds: payloadExpireSeconds(expiresRefreshMs),
          },
        },
      }
    }),
})
