import { join } from 'path'
import { LocalStorage, MemoryStorage } from './storage/index.js'
import { type BotConnection } from './types/websocket.js'

const cwd = import.meta.filename.endsWith('.ts') ? join(process.cwd(), '../') : process.cwd()

export const storage = process.env.STORAGE_TYPE === 'memory'
  ? new MemoryStorage()
  : new LocalStorage({
    storagePath: process.env.LOCAL_STORAGE_PATH ?? join(cwd, 'storage')
  })

export const bots = new Map<string, BotConnection>()