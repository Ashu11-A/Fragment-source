import { argv } from 'process'
import 'reflect-metadata'
import { metadata } from '.'
import { Crons } from './class/Crons'
import { SocketClient } from './controller/socket'
import { Discord } from './discord/base'

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
  await Crons.register()
  await Discord.register()

  if (args.length === 0) client.connect('3000')
  for (let argNum = 0; argNum < args.length; argNum++) {
    for (const { alias, command } of argsList) {
      if (alias.includes(args[argNum])) args[argNum] = command
    }

    switch (args[argNum]) {
      case 'info': {
        const info = JSON.stringify(await metadata())
        console.clear()
        console.log(info)
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
