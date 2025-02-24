import Config from '@/entity/Config.entry.js'
import Guild from '@/entity/Guild.entry.js'
import User from '@/entity/User.entry'
import { Database } from 'socket-client'

export const database = {
  guild: new Database<Guild>({ table: 'Guild' }),
  config: new Database<Config>({ table: 'Config' }),
  user: new Database<User>({ table: 'User' })
}