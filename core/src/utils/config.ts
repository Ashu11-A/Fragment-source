/**
 * In-memory runtime state for the core bot.
 *
 * All connection information (tokens, bot ID) is supplied by the daemon
 * via Docker environment variables at container start, and may be updated
 * at runtime through socket events.  There is no need for a persistent
 * config store — this plain object replaces the former `kfg`-based config.
 */

export interface CoreState {
  accessToken?: string
  refreshToken?: string
  discordToken?: string
  botId?: number
}

export const state: CoreState = {
  accessToken: process.env.FRAGMENT_ACCESS_TOKEN,
  refreshToken: process.env.FRAGMENT_REFRESH_TOKEN,
  botId: process.env.FRAGMENT_BOT_ID ? parseInt(process.env.FRAGMENT_BOT_ID, 10) : undefined,
}