import * as pkg from '../package.json'
import { Package } from 'utils/src/class/package'
Package.setData(pkg)
import { argv } from 'process'
import 'reflect-metadata'
import { Crons, Discord } from 'discord'
import { SocketClient } from 'socket-client'
import { metadata } from 'utils'


interface Args {
  command: string
  alias: string[]
}
const root = process.cwd()
const args = argv.splice(2).map((arg) => arg.replaceAll('-', ''))
const argsList: Args[] = [
  { command: 'info', alias: ['i'] },
  { command: 'port', alias: ['p'] }
]

async function app () {
  await Crons.register()
  await Discord.register()

  if (args.length === 0) new SocketClient({ port: 3000, path: root })
  for (let argNum = 0; argNum < args.length; argNum++) {
    for (const { alias, command } of argsList) {
      if (alias.includes(args[argNum])) args[argNum] = command
    }

    switch (args[argNum]) {
    case 'info': {
      const info = JSON.stringify(metadata())
      console.clear()
      console.log(info)
      break
    }
    case 'port': {
      argNum++
      new SocketClient({ port: Number(args[argNum]), path: root })
      break
    }
    }
  }
}

void app()
