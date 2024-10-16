import { Auth } from '@/controller/auth.js'
import { config } from 'dotenv'
import { rm } from 'fs/promises'
import { join } from 'path'
import { argv, cwd } from 'process'
import prompts from 'prompts'
import 'reflect-metadata'
import yargs from 'yargs'
import { Crypt } from './controller/crypt.js'
import { Lang } from './controller/lang.js'
import { License } from './controller/license.js'
import { Plugins } from './controller/plugins.js'
import { SocketController } from './controller/socket.js'
import { exists } from './functions/fs-extra.js'
import { cache, metadata, PKG_MODE } from './index.js'
import './register.js'

interface Args {
  command: string
  alias: string[]
}

const socket = new SocketController()
const args = argv.splice(2).map((arg) => arg.replaceAll('-', ''))
const argsList: Args[] = [
  { command: 'info', alias: ['i'] },
  { command: 'port', alias: ['p'] }
];

(async () => {
  config()
  prompts.override(yargs().argv)

  const lang = new Lang()
  await lang.register()
  if ((await new Crypt().read(true))?.language === undefined) await lang.selectLanguage()
  await new License().checker()
  await new Crypt().checker()
  await new Auth().checker()

  if (await exists(join(cwd(), 'entries'))) await rm(join(cwd(), 'entries'), { recursive: true })
  if (args.length === 0) socket.listen(cache.get('port'))

  const plugins = new Plugins({ port: String(cache.get('port')) })

  await plugins.load()
  void plugins.wather()
  socket.ready()

  for (let argNum = 0; argNum < args.length; argNum++) {
    for (const { alias, command } of argsList) {
      if (alias.includes(args[argNum])) args[argNum] = command
    }

    switch (args[argNum]) {
    case 'info': {
      const packageJSON = metadata
      const infos = ['name', 'version', 'description', 'author', 'license'].reverse()
      console.info(Object.entries(packageJSON).reverse().filter(([key]) => infos.includes(key)).reduce((object, [key, value]) => ({ [key]: value, ...object }), {}))
      break
    }
    case 'port': {
      argNum++
      socket.listen(Number(args[argNum]))
      break
    }
    }
  }

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
})()
