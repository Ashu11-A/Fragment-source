import { fileURLToPath } from 'bun'
import { readFile, writeFile } from 'fs/promises'
import { glob } from 'glob'
import { dirname, join } from 'path'
import { __plugin_dirname, isPKG } from 'utils'

const path = dirname(fileURLToPath(import.meta.url))

if (!isPKG(path)) {
  const path = join(__plugin_dirname, 'src/discord')
  const registerPath = join(path, '../register.ts')

  const crons = await glob(['crons/**/*.{ts,js}'], { cwd: path })
  const sortedCrons = crons.sort(customSort)

  let content =  await readFile(registerPath, { encoding: 'utf-8' }) ?? ''
  content += '\n// Crons\n'

  for (const pather of sortedCrons) {
    content += `import './${join('discord', pather)}'\n`
  }

  await writeFile(registerPath, content, { encoding: 'utf-8' })
}

/**
 * Organize Crons filter
 */
function customSort (a: string, b: string): number {
  const partsA = a.split('/')
  const partsB = b.split('/')
  for (let i = 0; i < Math.min(partsA.length, partsB.length); i++) {
    if (partsA[i] !== partsB[i]) {
      return partsA[i].localeCompare(partsB[i])
    }
  }
  return partsA.length - partsB.length
}
  