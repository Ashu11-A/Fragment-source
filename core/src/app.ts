import 'dotenv/config'
import 'reflect-metadata'
import './register.js'

import { Auth } from '@/controller/auth.js'
import { Cli } from 'cli'
import { Crypt } from 'crypt'
import { rm } from 'fs/promises'
import { join } from 'path'
import { cwd } from 'process'
import prompts from 'prompts'
import { exists } from 'utils'
import { Plugin, WebSocket, socketPort } from 'worker'
import yargs from 'yargs'
import { Event } from './controller/events.js'
import { License } from './controller/license.js'
import { PKG_MODE } from './index.js'

const socket = new WebSocket()
WebSocket.io.on('registered', async (client) => new Event(client).controller())

prompts.override(yargs().argv)

await new License().checker()
await new Crypt().checker()
await new Auth().checker()

if (await exists(join(cwd(), 'entries'))) await rm(join(cwd(), 'entries'), { recursive: true })
const plugin = new Plugin(socketPort)
plugin.watcher()

new Cli({
  functions: {
    port: (content) => {
      if (typeof content === 'number') socket.listen(content)
    }
  }
});

['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
  'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
].forEach(function (sig) {
  process.on(sig, async function () {
    if (PKG_MODE) {
      for await (const plugin of await WebSocket.io.fetchSockets()) {
        if (plugin) plugin.emit('kill')
      }
    }
    process.exit()
  })
})
