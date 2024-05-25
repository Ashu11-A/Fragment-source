import { existsSync } from 'fs'
import { exists } from 'fs-extra'
import { readFile, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { argv, cwd } from 'process'
import prompts, { PromptObject } from 'prompts'
import 'reflect-metadata'
import { env, PKG_MODE } from '.'
import { Plugins } from './controller/plugins'
import { SocketController } from './controller/socket'
import { Auth, encrypt } from './functions/key'
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

  if (!(await exists('.key'))) {
    const questions: PromptObject<string>[] = [
      { name: 'email', message: 'Email', type: 'text', warn: 'Apenas cadastrado em paymentbot.com' },
      { name: 'password', message: 'Senha', type: 'password', warn: 'Apenas cadastrado em paymentbot.com' },
      { name: 'token', message: 'Token', type: 'password', warn: 'Visível no Dashboard' }
    ]
  
    const response = await prompts(questions)
  
    if (Object.keys(response).length !== 3 || Object.entries(response).filter(([, content]) => content === '').length > 0) throw new Error('Formulário não respondido!')
      await encrypt(JSON.stringify(response))
  }

  const auth = new Auth()

  await auth.init()
  await auth.login()
  await auth.validator()

  if (env?.BOT_TOKEN === undefined || env?.BOT_TOKEN === 'Troque-me') {
    await writeFile(join(process.cwd(), '.env'), 'BOT_TOKEN=Troque-me', { encoding: 'utf-8' })
    throw new Error('Defina um token!')
  }
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
