import { readFile, writeFile } from 'fs/promises'
import { glob } from 'glob'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { __plugin_dirname, isPKG } from 'utils'

const dir = join(__plugin_dirname, 'src/discord')
const registerPath = join(dir, '../register.ts')
const content = (await readFile(registerPath, { encoding: 'utf-8' })).split('\n') ?? []

if (!isPKG(dirname(fileURLToPath(import.meta.url)))) {
  const dirnames = ['Commands', 'Events', 'Components', 'Configs', 'Crons']

  for (const dirname of dirnames) {
    const paths = (await glob(`${dirname.toLowerCase()}/**/*.{ts,js}`, {
      cwd: dir,
      dotRelative: true
    }))
      .map((path) => join('discord', path))
      .map((path) =>
        !path.startsWith('../')
          ? process.platform === 'win32' ? `.\\${path}` : `./${path}`
          : path
      )
      .map((path) => process.platform === 'win32' ? path.replaceAll(/\\/g, '\\\\') : path)
      
    content.push(`\n// ${dirname}`)
    for (const filePath of paths) content.push(`import '${filePath}'`)
  }

    
  await writeFile(registerPath, content.join('\n'), { encoding: 'utf-8' })
}