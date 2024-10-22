import { basename, dirname, join } from 'path'
import { fileURLToPath } from 'bun'
import { readFile } from 'fs/promises'
import { writeFile } from 'fs/promises'
import { PKG_MODE } from 'utils'

if (!PKG_MODE) {
  const plugins = []
  const content: Record<string, string> = {}

  const path = join(dirname(fileURLToPath(import.meta.url)), '../src')
  const format = (plugin: string) => join(path, plugin)

  plugins.push(
    format('entity/Claim.entry.ts'),
    format('entity/Config.entry.ts'),
    format('entity/Guild.entry.ts'),
    format('entity/Template.entry.ts'),
    format('entity/Ticket.entry.ts')
  )

  for (const plugin of plugins) {
    content[basename(plugin)] = await readFile(plugin, { encoding: 'utf-8' })
  }

  await writeFile('entries.json', JSON.stringify(content, null, 2))
}

import { Plugins } from 'socket-client'
import '../build/entries'
import * as entries from '../entries.json'

Plugins.setPlugins(entries)