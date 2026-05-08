import { TypedSocketClient, coreContract, SocketNamespace } from 'socket'
import { io as socketIoClient, type Socket } from 'socket.io-client'

export class CoreSocketManager {
  private client: TypedSocketClient<typeof coreContract.serverToClient, typeof coreContract.clientToServer> | null = null
  private rawIo: Socket | null = null
  private botId: number | null = null
  private telemetryTimer: ReturnType<typeof setInterval> | null = null
  private proactiveRefreshTimer: ReturnType<typeof setTimeout> | null = null
  private lastCpuUsage = process.cpuUsage()
  private lastCpuSampleAt = Date.now()
  private isRefreshing = false

  constructor(private readonly config: {
    serverUrl: string
    getAccessToken: () => string | null
    getRefreshToken: () => string | null
    getBotId: () => number | null
    onTokenRefreshed: (tokens: { accessToken: string; refreshToken: string; accessExpiresAt: number }) => Promise<void>
    onDiscordTokenReceived: (token: string) => Promise<void>
    onBotIdReceived: (botId: number) => Promise<void>
    onEnvVarsReceived: (envs: Array<{ name: string; value: string }>) => Promise<void>
    getCoreVersion: () => string
    getActivePluginsCount: () => number
  }) {}

  get isConnected(): boolean {
    return this.rawIo?.connected === true
  }

  get isMirrorReady(): boolean {
    return this.isConnected && this.botId != null
  }

  get activeBotId(): number | null {
    return this.botId
  }

  getTypedClient() {
    return this.client
  }

  connect(): TypedSocketClient<typeof coreContract.serverToClient, typeof coreContract.clientToServer> {
    if (this.client) return this.client

    const url = this.config.serverUrl.replace('0.0.0.0', '127.0.0.1')
    const token = this.config.getAccessToken() || ''
    
    this.rawIo = socketIoClient(`${url}${SocketNamespace.Core}`, {
      auth: { token },
      transports: process.env.NODE_ENV === 'production' ? ['websocket'] : ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
    })

    this.client = new TypedSocketClient(this.rawIo, coreContract.serverToClient, SocketNamespace.Core)

    this.client.onConnect(() => {
      console.log(`[core:socket] Connected to server! (id: ${this.client!.id})`)
      this.client!.emit('ping')
      if (this.botId != null) {
        this.emitIdentify()
      }
      this.emitRuntimeTelemetry()
      this.ensureRuntimeTelemetryLoop()
      this.scheduleProactiveRefreshFromToken()
    })

    this.client.onDisconnect((reason) => {
      console.log(`[core:socket] Disconnected: ${reason}`)
    })

    this.client.onError((error) => {
      console.error(`[core:socket] Connection error: ${error.message}`)
    })

    this.client.onReconnect((attempt) => {
      console.log(`[core:socket] Reconnected after ${attempt} attempts`)
    })

    this.rawIo.on('connect_error', async (err) => {
      if (err.message !== 'Authentication error') return
      console.warn('[core:socket] Authentication error detected — attempting token refresh')
      await this.handleAuthError()
    })

    // Typed events
    this.client.on('config:discordToken', async (data) => {
      console.log('[core:socket] Received Discord token configuration')
      await this.config.onDiscordTokenReceived(data.token)
    })

    this.client.on('config:botId', async (data) => {
      console.log(`[core:socket] Received bot ID configuration: ${data.botId}`)
      this.identify(data.botId)
      await this.config.onBotIdReceived(data.botId)
    })

    this.client.on('config:envVars', async (data) => {
      console.log(`[core:socket] Received ${data.envs.length} env var(s) from server`)
      await this.config.onEnvVarsReceived(data.envs)
    })

    return this.client
  }

  disconnect(): void {
    if (this.telemetryTimer) {
      clearInterval(this.telemetryTimer)
      this.telemetryTimer = null
    }
    if (this.proactiveRefreshTimer) {
      clearTimeout(this.proactiveRefreshTimer)
      this.proactiveRefreshTimer = null
    }
    this.client?.disconnect()
    this.client = null
    this.rawIo = null
  }

  private scheduleProactiveRefreshFromToken(): void {
    const token = this.config.getAccessToken()
    if (!token) return
    try {
      const parts = token.split('.')
      if (parts.length !== 3) return
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as { exp?: number }
      if (typeof payload.exp === 'number') {
        this.scheduleProactiveRefresh(payload.exp * 1000)
      }
    } catch {
      // malformed token — let reactive auth handle it
    }
  }

  scheduleProactiveRefresh(accessExpiresAt: number): void {
    if (this.proactiveRefreshTimer) {
      clearTimeout(this.proactiveRefreshTimer)
      this.proactiveRefreshTimer = null
    }
    const msUntilExpiry = accessExpiresAt - Date.now()
    // Refresh at 80% of the remaining TTL, minimum 30 seconds before expiry.
    const delay = Math.max(msUntilExpiry * 0.8, msUntilExpiry - 30_000)
    if (delay <= 0) {
      void this.handleAuthError()
      return
    }
    this.proactiveRefreshTimer = setTimeout(() => {
      this.proactiveRefreshTimer = null
      void this.handleAuthError()
    }, delay)
  }

  identify(botId: number): void {
    this.botId = botId
    if (this.isConnected) {
      this.emitIdentify()
    }
  }

  emitConsoleLines(lines: string[]): void {
    if (!this.isMirrorReady || lines.length === 0) return
    this.client!.emit('core:console:push', { lines })
  }

  waitForConnect(): Promise<void> {
    if (this.isConnected) return Promise.resolve()
    return new Promise((resolve) => {
      const handler = () => {
        this.rawIo?.off('connect', handler)
        resolve()
      }
      this.rawIo?.on('connect', handler)
    })
  }

  private emitIdentify() {
    if (!this.client || this.botId == null) return
    this.client.emit('client:identify', { botId: this.botId, version: this.config.getCoreVersion() })
  }

  private emitRuntimeTelemetry(): void {
    if (!this.client || this.botId == null) return

    const now = Date.now()
    const elapsedMicros = Math.max(1, (now - this.lastCpuSampleAt) * 1000)
    const diff = process.cpuUsage(this.lastCpuUsage)
    this.lastCpuUsage = process.cpuUsage()
    this.lastCpuSampleAt = now

    const cpuTotalMicros = diff.user + diff.system
    const cpuUsagePercent = (cpuTotalMicros / elapsedMicros) * 100
    const memoryUsageMb = process.memoryUsage().rss / (1024 * 1024)

    this.client.emit('core:runtime:report', {
      cpuUsagePercent,
      memoryUsageMb,
      activePlugins: this.config.getActivePluginsCount(),
    })
  }

  private ensureRuntimeTelemetryLoop(): void {
    if (this.telemetryTimer != null) return
    this.telemetryTimer = setInterval(() => {
      this.emitRuntimeTelemetry()
    }, 5000)
  }

  private async handleAuthError(): Promise<void> {
    if (this.isRefreshing) return
    this.isRefreshing = true

    try {
      const refreshToken = this.config.getRefreshToken()
      const botId = this.botId ?? this.config.getBotId()
      if (!refreshToken || !botId) {
        console.error('[core:socket] Cannot refresh — missing refresh token or bot ID')
        return
      }

      const url = this.config.serverUrl.replace('0.0.0.0', '127.0.0.1')
      console.log('[core:socket] Attempting token refresh via /api/container/refresh ...')

      const response = await fetch(`${url}/api/container/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken, botId }),
      })

      if (!response.ok) {
        const body = await response.text()
        console.error(`[core:socket] Token refresh failed (${response.status}): ${body}`)
        return
      }

      const data = await response.json() as { accessToken: string; refreshToken: string; accessExpiresAt: number }
      await this.config.onTokenRefreshed(data)

      if (this.rawIo) {
        this.rawIo.auth = { token: data.accessToken }
        console.log('[core:socket] Auth token updated — socket will reconnect automatically')
      }

      if (data.accessExpiresAt) {
        this.scheduleProactiveRefresh(data.accessExpiresAt)
      }
    } catch (error) {
      console.error('[core:socket] Token refresh error:', error instanceof Error ? error.message : error)
    } finally {
      this.isRefreshing = false
    }
  }
}
