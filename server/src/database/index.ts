import dataSource from './dataSource.js'
import { Auth } from './entity/Auth.js'
import { Bot } from './entity/Bot.js'
import { Plugin } from './entity/Plugin.js'
import { Subscription } from './entity/Subscription.js'
import { User } from './entity/User.js'

export const authTreeRepository = dataSource.getTreeRepository(Auth)

export const repository = {
  user: dataSource.getRepository(User),
  request: dataSource.getRepository(Request),
  auth: dataSource.getRepository(Auth),
  bot: dataSource.getRepository(Bot),
  plugin: dataSource.getRepository(Plugin),
  subscription: dataSource.getRepository(Subscription),
}
