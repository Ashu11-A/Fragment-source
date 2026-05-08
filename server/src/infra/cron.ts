import Keyv from 'keyv'
import KeyvValkey from '@keyv/valkey'
import { REDIS_URL } from '@/singletons'

let keyvInstance: Keyv | null = null

function getKeyv(): Keyv {
  if (!keyvInstance) {
    keyvInstance = new Keyv(new KeyvValkey(REDIS_URL))
  }
  return keyvInstance
}

export interface DistributedLockOptions {
  ttlMs?: number
  retryDelayMs?: number
  maxRetries?: number
}

async function acquireLock(lockKey: string, options: DistributedLockOptions = {}): Promise<boolean> {
  const { ttlMs = 300_000, retryDelayMs = 100, maxRetries = 0 } = options
  const keyv = getKeyv()
  const instanceId = `${process.pid}-${Date.now()}`

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const existing = await keyv.get(lockKey)
    if (!existing) {
      await keyv.set(lockKey, instanceId, ttlMs)
      const verify = await keyv.get(lockKey)
      if (verify === instanceId) return true
    }
    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
    }
  }

  return false
}

async function releaseLock(lockKey: string): Promise<void> {
  await getKeyv().delete(lockKey)
}

export interface CronConfig<TResult = void> {
  name: string
  intervalMs: number
  handler: () => Promise<TResult>
  runOnStart?: boolean
  distributedLock?: DistributedLockOptions & { enabled: boolean; lockKey?: string }
}

export class Cron<TResult = void> {
  private config: CronConfig<TResult>
  private timer: ReturnType<typeof setInterval> | null = null
  private isRunning = false

  constructor(config: CronConfig<TResult>) {
    this.config = config
  }

  get name(): string {
    return this.config.name
  }

  get isActive(): boolean {
    return this.timer !== null
  }

  start(): void {
    if (this.timer) {
      console.warn(`[cron:${this.config.name}] already started`)
      return
    }

    if (this.config.runOnStart ?? true) {
      this.execute()
    }

    this.timer = setInterval(() => this.execute(), this.config.intervalMs)
    console.log(`[cron:${this.config.name}] started (interval: ${this.config.intervalMs}ms)`)
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
      console.log(`[cron:${this.config.name}] stopped`)
    }
  }

  async runOnce(): Promise<TResult | null> {
    return this.execute()
  }

  private async execute(): Promise<TResult | null> {
    if (this.isRunning) {
      console.log(`[cron:${this.config.name}] previous execution still running — skipping`)
      return null
    }

    this.isRunning = true

    try {
      if (this.config.distributedLock?.enabled) {
        const lockKey = this.config.distributedLock.lockKey ?? `cron:${this.config.name}:lock`
        const acquired = await acquireLock(lockKey, this.config.distributedLock)
        if (!acquired) {
          console.log(`[cron:${this.config.name}] could not acquire distributed lock — skipping`)
          return null
        }

        try {
          return await this.config.handler()
        } finally {
          await releaseLock(lockKey)
        }
      }

      return await this.config.handler()
    } catch (error) {
      console.error(`[cron:${this.config.name}] execution error:`, error)
      return null
    } finally {
      this.isRunning = false
    }
  }
}
