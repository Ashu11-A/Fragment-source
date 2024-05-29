import { existsSync } from 'fs'
import { readFile, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { argv, cwd } from 'process'
import prompts from 'prompts'
import 'reflect-metadata'
import { PKG_MODE } from '.'
import { Plugins } from './controller/plugins'
import { SocketController } from './controller/socket'
import { Auth } from '@/controller/auth'
import { generatePort } from './functions/port'

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
  prompts.override((await import('yargs')).argv)

  
  const auth = new Auth()
  
  await auth.login()
  await auth.validator()

  if (existsSync(join(cwd(), 'entries'))) await rm(join(cwd(), 'entries'), { recursive: true })

  const port = PKG_MODE ? String(await generatePort()) : '3000'
  const plugins = new Plugins({ port })

  await plugins.load()
  void plugins.wather()
  socket.ready()

  if (args.length === 0) socket.listen(port)
  for (let argNum = 0; argNum < args.length; argNum++) {
    for (const { alias, command } of argsList) {
      if (alias.includes(args[argNum])) args[argNum] = command
    }

    switch (args[argNum]) {
    case 'info': {
      const packageJSON = JSON.parse(await readFile(join(__dirname, '../package.json'), { encoding: 'utf-8' })) as Record<string, string | object | []>
      const infos = ['name', 'version', 'description', 'author', 'license'].reverse()
      console.info(Object.entries(packageJSON).reverse().filter(([key]) => infos.includes(key)).reduce((object, [key, value]) => ({ [key]: value, ...object }), {}))
      break
    }
    case 'port': {
      argNum++
      socket.listen(args[argNum])
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
    });
  });
})()
