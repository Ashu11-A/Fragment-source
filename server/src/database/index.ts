import dataSource from '@/database/dataSource.js'
import { Bot } from '@/database/entity/Bot.js'
import { Node } from '@/database/entity/Node.js'
import { Plan } from '@/database/entity/Plan.js'
import { Plugin } from '@/database/entity/Plugin.js'
import { PluginRelease } from '@/database/entity/PluginRelease.js'
import { PluginSale } from '@/database/entity/PluginSale.js'
import { Subscription } from '@/database/entity/Subscription.js'
import { User } from '@/database/entity/User.js'
import { Session } from '@/database/entity/Session.js'

export const repository = {
  user: dataSource.getRepository(User),
  Session: dataSource.getRepository(Session),
  bot: dataSource.getRepository(Bot),
  node: dataSource.getRepository(Node),
  plan: dataSource.getRepository(Plan),
  plugin: dataSource.getRepository(Plugin),
  pluginRelease: dataSource.getRepository(PluginRelease),
  pluginPublishRequest: dataSource.getRepository(PluginRelease),
  pluginSale: dataSource.getRepository(PluginSale),
  subscription: dataSource.getRepository(Subscription),
}
