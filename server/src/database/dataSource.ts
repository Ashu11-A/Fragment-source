import 'dotenv/config'
import mysql from 'mysql2/promise'
import { dirname, join } from 'node:path'
import { DataSource } from 'typeorm'
import { fileURLToPath } from 'node:url'

import { BaseEntity } from './entity/base'
import { File } from './entity/File.js'

import { User } from './entity/User.js'
import { Session } from './entity/Session.js'
import { Plan } from './entity/Plan.js'
import { Release } from './entity/Release.js'

import { Node } from './entity/Node.js'
import { Plugin } from './entity/Plugin.js'
import { PluginRelease } from './entity/PluginRelease.js'
import { PluginSale } from './entity/PluginSale.js'

import { Log } from './entity/Log.js'
import { Bot } from './entity/Bot.js'
import { Variable } from './entity/Variable.js'
import { Subscription } from './entity/Subscription.js'

const path = dirname(fileURLToPath(import.meta.url))

async function getDatabase(database: 'mysql' | 'sqljs' = 'sqljs') {
  switch (database) {
  case 'mysql': {
    const host = String(process.env.DATABASE_HOST || 'localhost')
    const port = Number(process.env.DATABASE_PORT || 3306)
    const username = String(process.env.DATABASE_USERNAME || 'root')
    const password = String(process.env.DATABASE_PASSWORD || '')
    const dbName = String(process.env.DATABASE_NAME || 'posto')

    const rootSource = await mysql.createConnection({
      host,
      port,
      user: username,
      password
    })

    await rootSource.query(`CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`)
    await rootSource.query(`GRANT ALL PRIVILEGES ON ${dbName}.* TO '${username}'@'%' IDENTIFIED BY '${password}';`)
    await rootSource.query('FLUSH PRIVILEGES;')
    await rootSource.end()

    return {
      type: 'mysql' as const,
      host,
      port,
      username,
      password,
      database: dbName,
      charset: 'utf8mb4',
    }
  }
  default: {
    return {
      type: 'sqljs' as const,
      autoSave: true,
      useLocalForage: true,
      location: String(process.env.DATABASE_FILE || 'database.wm'),
    }
  }
  }
}

export default new DataSource({
  ...(await getDatabase(process.env.DATABASE_TYPE as 'mysql' | 'sqljs' | undefined)),
  synchronize: true,
  logging: false,
  entities: [
    BaseEntity,
    File,
    User,
    Session,
    Plan,
    Release,
    Node,
    Plugin,
    PluginRelease,
    PluginSale,
    Log,
    Bot,
    Variable,
    Subscription,
  ],
  migrations: [join(path, 'migration', '**', '*.{js,ts}')],
})
