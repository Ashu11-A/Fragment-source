import { readFile, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { argv, cwd } from 'process'
import { env, PKG_MODE } from '.'
import { Plugins } from './controller/plugins'
import { SocketController } from './controller/socket'
import { generatePort } from './functions/port'
import 'reflect-metadata'
import { existsSync } from 'fs'

interface Args {
  command: string
  alias: string[]
}

const socket = new SocketController()
const args = argv.splice(2).map((arg) => arg.replaceAll('-', ''))
const argsList: Args[] = [
  { command: 'info', alias: ['i'] },
  { command: 'port', alias: ['p'] }
]

async function app() {
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
}

void app()
