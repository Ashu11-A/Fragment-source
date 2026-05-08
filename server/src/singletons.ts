import { dirname, join } from 'path'
import { LocalStorage, MemoryStorage } from 'storage'
import { fileURLToPath } from 'url'
import { DaemonSocketManager } from '@/socket/DaemonSocketManager.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const cwd = import.meta.filename.endsWith('.ts')
  ? join(__dirname, '../')
  : process.cwd()

export const storage = process.env.STORAGE_TYPE === 'memory'
  ? new MemoryStorage()
  : new LocalStorage({
    storagePath: join(cwd, process.env.LOCAL_STORAGE_PATH ?? 'storage')
  })

export const baseUrl = (process.env.BACK_END_URL ?? `http://localhost:${process.env.PORT}`)
export const daemonManager = new DaemonSocketManager(Number(process.env['DAEMON_TCP_PORT']) || 9000)

export const REDIS_URL = (() => {
  const host = process.env['REDIS_HOST'] ?? 'localhost'
  const port = Number(process.env['REDIS_PORT']) || 6379
  const password = process.env['REDIS_PASSWORD']
  if (password && password.length > 0) {
    return `redis://:${password}@${host}:${port}`
  }
  return `redis://${host}:${port}`
})()