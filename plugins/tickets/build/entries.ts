import { basename, dirname, join } from 'path'
import { fileURLToPath } from 'bun'
import { readFile } from 'fs/promises'
import { writeFile } from 'fs/promises'
import { isPKG } from 'utils'
const path = dirname(fileURLToPath(import.meta.url))

if (!isPKG(path)) {
  const entries = []
  const content: Record<string, string> = {}
  
  const path = join(dirname(fileURLToPath(import.meta.url)), '../src')
  const registerPath = join(path, 'register.ts')
  const format = (entry: string) => join(path, entry)

  entries.push(
    format('entity/Claim.entry.ts'),
    format('entity/Config.entry.ts'),
    format('entity/Guild.entry.ts'),
    format('entity/Template.entry.ts'),
    format('entity/Ticket.entry.ts')
  )

  for (const entry of entries) {
    content[basename(entry)] = await readFile(entry, { encoding: 'utf-8' })
  }

  await writeFile('entries.json', JSON.stringify(content, null, 2))

  let registers = await readFile(registerPath, { encoding: 'utf-8' }) ?? ''
  registers += `// Entries

import { Entry } from 'socket-client'
import * as entries from '../entries.json'

Entry.setEntries(entries)
`

  await writeFile(registerPath, registers, { encoding: 'utf-8' })
}