import dataSource from '@/database/dataSource.js'
import { Auth } from '@/database/entity/Auth.js'
import { Bot } from '@/database/entity/Bot.js'
import { Plugin } from '@/database/entity/Plugin.js'
import { Subscription } from '@/database/entity/Subscription.js'
import { User } from '@/database/entity/User.js'

export const authTreeRepository = dataSource.getTreeRepository(Auth)

export const repository = {
  user: dataSource.getRepository(User),
  request: dataSource.getRepository(Request),
  auth: dataSource.getRepository(Auth),
  bot: dataSource.getRepository(Bot),
  plugin: dataSource.getRepository(Plugin),
  subscription: dataSource.getRepository(Subscription),
}
