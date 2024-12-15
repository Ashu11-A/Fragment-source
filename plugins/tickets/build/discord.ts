import { readFile, writeFile } from 'fs/promises'
import { glob } from 'glob'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { __plugin_dirname, isPKG } from 'utils'

const path = dirname(fileURLToPath(import.meta.url))

if (!isPKG(path)) {
  const dir = join(__plugin_dirname, 'src/discord')
  const paths = (await glob([
    'commands/**/*.{ts,js}',
    'events/**/*.{ts,js}',
    'components/**/*.{ts,js}',
    'configs/**/*.{ts,js}'
  ], { cwd: dir })).map((path) => join('discord', path))
  const registerPath = join(dir, '../register.ts')
    
  let content = await readFile(registerPath, { encoding: 'utf-8' }) ?? ''
  content += '\n// Discord\n'

  for (const filePath of paths) {
    content += `import './${filePath}'\n`
  }
    
  await writeFile(registerPath, content, { encoding: 'utf-8' })
}