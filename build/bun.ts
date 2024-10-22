import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { mkdir } from 'fs/promises'
import { readFile } from 'fs/promises'
import { glob } from 'glob'
import { join } from 'path'

const plugins = await glob(['plugins/*'])

if (!existsSync('release')) await mkdir('release')

for (const plugin of plugins) await build(plugin)
await build('core')

async function build (plugin: string) {
  const pkg = JSON.parse(await readFile(join(plugin, 'package.json'), { encoding: 'utf-8' }))
  const appName = `${pkg.name}-${process.platform}-${process.arch}`

  if (pkg.scripts?.build !== undefined) execSync(`cd ${plugin} && bun run build`)
  
  execSync(`cd ${plugin} && bun build ./src/app.ts --target=bun --compile --outfile=${appName}`, { stdio: 'inherit' })
  execSync(`cd ${plugin} && 7z a -m0=lzma2 -mx9 -sfx ${appName}-installer ${appName}`, { stdio: 'inherit' })
  execSync(`mv ${plugin}/${appName} release/ && mv ${plugin}/${appName}-installer release/`)
}