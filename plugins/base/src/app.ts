import { readFile } from 'fs/promises'
import { join } from 'path'
import { argv } from 'process'
import 'reflect-metadata'
import { SocketClient } from './controller/socket'
import { register } from './discord/register'

interface Args {
  command: string
  alias: string[]
}

const client = new SocketClient()
const args = argv.splice(2).map((arg) => arg.replaceAll('-', ''))
const argsList: Args[] = [
  { command: 'info', alias: ['i'] },
  { command: 'port', alias: ['p'] }
]

async function app () {
  await register()

  if (args.length === 0) client.connect('3000')
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
        client.connect(args[argNum])
        break
      }
    }
  }
}

void app()
