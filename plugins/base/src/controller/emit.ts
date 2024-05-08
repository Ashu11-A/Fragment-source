import { DiscordCommand } from '@/discord/Commands'
import { DiscordComponent } from '@/discord/Components'
import { DiscordEvent } from '@/discord/Event'
import { readFile } from 'fs/promises'
import { glob } from 'glob'
import { basename, join } from 'path'
import { metadata } from '..'
import { SocketClient } from './socket'

export class Emit {
  constructor () {}

  commands () { SocketClient.client.emit('commands', DiscordCommand.all) }
  components () { SocketClient.client.emit('components', DiscordComponent.all) }
  events () { SocketClient.client.emit('events', DiscordEvent.all) }
  async entries () {
    const files = await glob([`${join(__dirname, '..', 'entity')}/**/*.{ts,js}`])
    let sent = 0
    for (const file of files) {
      const fileName = basename(file)
      sent++
      SocketClient.client.emit('entries', { total: files.length, sent, fileName, code: await readFile(file, { encoding: 'utf-8' }) })
    }
  }

  async ready () { SocketClient.client.emit('metadata', await metadata()) }
}
