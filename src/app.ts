import { createClient } from './discord/base'
import { log, processEnv } from './settings'
import Loggings from '@/controllers/Loggings'
import { dirCR, dirEX, jsonsv } from '@/functions'
import { QuickDB } from 'quick.db'
import { join } from 'path'
import { writeFileSync } from 'fs'
import axios from 'axios'
export * from 'colors'

const client = createClient()
const core = new Loggings('All', 'blue')
const rootDir = process.cwd()

dirCR(`${rootDir}/database`)

async function checkConfig (): Promise<void> {
  if (processEnv.BOT_TOKEN === undefined) {
  // Generate .env content
    const envContent = Object.entries({ BOT_TOKEN: 'MeTroque' })
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')
    // Write .env file
    writeFileSync('.env', envContent)
  }
  if (processEnv.BOT_TOKEN === 'MeTroque') {
    throw new Error('Defina o token em .env', { cause: 'Token não fornecido' })
  }

  if (!dirEX('./settings/settings.json')) {
    await axios.get('https://raw.githubusercontent.com/Ashu11-A/PaymentBot/main/src/settings/settings.exemple.json')
      .then((res) => {
        dirCR(`${rootDir}/settings`)
        jsonsv('./settings/settings.json', res.data)
      })
  }
}

const db = {
  guilds: new QuickDB({ filePath: join(rootDir, 'database/guilds.sqlite'), table: 'guilds' }),
  payments: new QuickDB({ filePath: join(rootDir, 'database/guilds.sqlite'), table: 'payments' }),
  messages: new QuickDB({ filePath: join(rootDir, 'database/guilds.sqlite'), table: 'messages' }),
  staff: new QuickDB({ filePath: join(rootDir, 'database/guilds.sqlite'), table: 'staff' }),
  system: new QuickDB({ filePath: join(rootDir, 'database/guilds.sqlite'), table: 'system' }),
  accounts: new QuickDB({ filePath: join(rootDir, 'database/guilds.sqlite'), table: 'accounts' }),
  tokens: new QuickDB({ filePath: join(rootDir, 'database/tokens.sqlite'), table: 'tokens' }),
  telegram: new QuickDB({ filePath: join(rootDir, 'database/telegram.sqlite') }),
  ctrlPanel: new QuickDB({ filePath: join(rootDir, 'database/ctrlPanel.sqlite') }),
  pterodactyl: new QuickDB({ filePath: join(rootDir, 'database/pterodactyl.sqlite') })
}

void checkConfig().then(() => {
  client.start()
  process.on('uncaughtException', log.error)
  process.on('unhandledRejection', log.error)
})

export { client, core, db }
