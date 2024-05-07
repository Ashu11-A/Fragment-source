import { DiscordCommand } from '@/discord/Commands'
import { DiscordComponent } from '@/discord/Components'
import { DiscordEvent } from '@/discord/Event'
import { readFile } from 'fs/promises'
import { glob } from 'glob'
import { basename, join } from 'path'
import { metadata } from '..'
import { SocketClient } from './socket'

export class Emit {
  private readonly client
  constructor () {
    this.client = SocketClient.client
  }

  commands () { this.client.emit('commands', DiscordCommand.all) }
  components () { this.client.emit('components', DiscordComponent.all) }
  events () { this.client.emit('events', DiscordEvent.all) }
  async entries () {
    const files = await glob([`${join(__dirname, '..', 'entity')}/**/*.{ts,js}`])
    for (const file of files) {
      const fileName = basename(file)
      this.client.emit('entries', { fileName, code: await readFile(file, { encoding: 'utf-8' }) })
    }
  }

  async ready () { this.client.emit('metadata', await metadata()) }
}
