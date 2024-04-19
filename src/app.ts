import { dirCR, dirEX, jsonsv } from '@/functions'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { QuickDB } from 'quick.db'
import { createClient } from './discord/base'
import { log, processEnv } from './settings'
import axios from 'axios'
import { Loggings } from 'loggings'
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

  if (!dirEX('./settings.json')) {
    await axios.get('https://raw.githubusercontent.com/Ashu11-A/PaymentBot/release/settings.exemple.json')
      .then((res) => {
        dirCR(`${rootDir}/settings`)
        jsonsv('./settings.json', res.data)
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
  ctrlPanel: new QuickDB({ filePath: join(rootDir, 'database/ctrlPanel.sqlite') }),
  pterodactyl: new QuickDB({ filePath: join(rootDir, 'database/pterodactyl.sqlite') }),
  tickets: new QuickDB({ filePath: join(rootDir, 'database/tickets.sqlite') })
}

void checkConfig().then(() => {
  client.start()
  process.on('uncaughtException', log.error)
  process.on('unhandledRejection', log.error)
})

export { client, core, db }
