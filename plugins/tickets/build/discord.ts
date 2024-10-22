import { __plugin_dirname, PKG_MODE } from 'utils'
import { join } from 'path'
import { glob } from 'glob'
import { writeFile } from 'fs/promises'
import { readFile } from 'fs/promises'

if (!PKG_MODE) {
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