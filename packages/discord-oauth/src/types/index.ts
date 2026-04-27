import { z } from 'zod'

export const discordTokenResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  scope: z.string(),
})

export const discordUserSchema = z.object({
  id: z.string().min(1),
  username: z.string(),
  global_name: z.string().nullable(),
  email: z.string().optional(),
  verified: z.boolean().optional(),
})

export type DiscordTokenResponse = z.infer<typeof discordTokenResponseSchema>
export type DiscordUser = z.infer<typeof discordUserSchema>

export type OAuthStatePayload = {
  redirect_uri: string
  typ: 'discord_oauth'
}
