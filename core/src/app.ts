import 'reflect-metadata'

import './register.js'
import { cache, PKG_MODE } from './index.js'

import { Cli } from 'cli'
import { exists } from 'utils'

import { Crypt } from 'crypt'
import { config } from 'dotenv'
import { rm } from 'fs/promises'
import { join } from 'path'
import { cwd } from 'process'
import prompts from 'prompts'
import yargs from 'yargs'
import { License } from './controller/license.js'
import { Plugins } from './controller/plugins.js'
import { SocketController } from './controller/socket.js'
import { Auth } from '@/controller/auth.js'

const socket = new SocketController()

config()
prompts.override(yargs().argv)

await new License().checker()
await new Crypt().checker()
await new Auth().checker()

if (await exists(join(cwd(), 'entries'))) await rm(join(cwd(), 'entries'), { recursive: true })

const plugins = new Plugins({ port: String(cache.get('port')) })

await plugins.load()
plugins.wather()
socket.ready()

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
      for await (const plugin of await SocketController.io.fetchSockets()) {
        if (plugin) plugin.emit('kill')
      }
    }
    process.exit()
  })
})
