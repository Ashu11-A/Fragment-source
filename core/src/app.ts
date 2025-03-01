import 'dotenv/config'
import 'reflect-metadata'
import './register.js'

import { Auth } from '@/controller/auth.js'
import { Cli } from 'cli'
import { Crypt } from 'crypt'
import { rm } from 'fs/promises'
import { join } from 'path'
import prompts from 'prompts'
import { exists, generatePort } from 'utils'
import { Plugin, WebSocket } from 'worker'
import yargs from 'yargs'
import { Event } from './controller/events.js'
import { License } from './controller/license.js'
import { PKG_MODE, RootPATH } from './index.js'

const port = PKG_MODE ? await generatePort() : 3000
const socket = new WebSocket(port)
WebSocket.io.on('connect', async (socket) => new Event(socket).controller())

prompts.override(yargs().argv)

await new License().checker()
await new Crypt().checker()
await new Auth().checker()

if (await exists(join(RootPATH, 'entries'))) await rm(join(RootPATH, 'entries'), { recursive: true })
console.log(`Esperando conexões na porta: ${socket.port}`)
const manager = new Plugin(socket.port)
manager.watcher()

new Cli({
  functions: {
    port: (content) => {
      if (typeof content === 'number') socket.listen(content)
    }
  }
})
