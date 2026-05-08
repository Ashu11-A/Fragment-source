import { CoreSocketManager } from '../socket/CoreSocketManager.js'
import { API_URL, state, storage } from '@/singletons.js'
import { Plugin } from 'worker'
import * as corePkg from '../../package.json' with { type: 'json' }
import { serverStatus } from './server/status.js'

const coreVersion = (corePkg as unknown as { default?: { version?: string }; version?: string }).default?.version
  ?? (corePkg as unknown as { version?: string }).version
  ?? 'unknown'

export const coreSocketManager = new CoreSocketManager({
  serverUrl: API_URL,
  getAccessToken: () => state.accessToken || null,
  getRefreshToken: () => state.refreshToken || null,
  getBotId: () => state.botId ?? null,
  getCoreVersion: () => coreVersion,
  getActivePluginsCount: () => Plugin.all.size,

  onTokenRefreshed: async (tokens) => {
    state.accessToken = tokens.accessToken
    state.refreshToken = tokens.refreshToken

    const accessExpireDate = tokens.accessExpiresAt ? new Date(tokens.accessExpiresAt).toISOString() : ''
    const accessExpireSeconds = tokens.accessExpiresAt ? Math.floor((tokens.accessExpiresAt - Date.now()) / 1000) : 0

    await storage.append('.data', {
      accessToken: { token: tokens.accessToken, expireDate: accessExpireDate, expireSeconds: accessExpireSeconds },
      refreshToken: { token: tokens.refreshToken, expireDate: '', expireSeconds: 0 },
    }, { isJson: true })
  },
  
  onDiscordTokenReceived: async (token) => {
    state.discordToken = token
    await storage.append('.data', { token }, { isJson: true })
    if (state.discordToken) {
      const core = (await import('@/app.js')).default
      await core.discord.start()
    }
  },
  
  onBotIdReceived: async (botId) => {
    state.botId = botId
  },

  onEnvVarsReceived: async (envs) => {
    for (const { name, value } of envs) {
      process.env[name] = value
    }
    console.log(`[core:socket] Applied ${envs.length} env var(s) to process environment`)
  },
})

// Bind existing events to the manager's socket
const originalConnect = coreSocketManager.connect.bind(coreSocketManager)
coreSocketManager.connect = () => {
  const socket = originalConnect()
  serverStatus.register(socket as any)
  return socket
}

export function connectSocket(token: string) {
  // Update state with token before connecting
  state.accessToken = token
  return coreSocketManager.connect()
}

export function emitCoreConsoleLines(lines: string[]) {
  coreSocketManager.emitConsoleLines(lines)
}

export function setServerSocketBotId(botId: number | null) {
  state.botId = botId || undefined
  if (botId != null) {
    coreSocketManager.identify(botId)
  }
}

export function getServerBotId() {
  return coreSocketManager.activeBotId
}

export function waitForConnect() {
  return coreSocketManager.waitForConnect()
}

export function getMirrorReady() {
  return coreSocketManager.isMirrorReady
}
