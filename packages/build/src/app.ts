import { glob } from 'glob'
import { basename, join } from 'path'
import { __plugin_dirname, isPKG } from 'utils'
import esbuild from 'esbuild'
import { writeFile } from 'fs/promises'
import { bundle } from './utils/bundle'
import { readFile } from 'fs/promises'

const sourcePath = join(__plugin_dirname, 'src')
const DIRECTORIES = ['Commands', 'Events', 'Components', 'Configs', 'Crons'] as const

export function getPlatformPath(path: string): string {
  const isWindows = process.platform === 'win32'
  // Verifica se o caminho é relativo (não começa com "../" nem com "C:" ou similar)
  if (!path.startsWith('../') && !/^[a-zA-Z]:/.test(path)) {
    path = isWindows ? `.\\${path}` : `./${path}`
  }
  return isWindows
    ? path.replaceAll('/', '\\').replace(/\\/g, '\\\\')
    : path
}

async function generateEntityImports() {
  const entries = await glob('entity/*', { cwd: sourcePath })
  const imports: string[] = []
  const entryProd: Record<string, string> = {}
  const entryDev: Record<string, string> = {}

  for (const entry of entries) {
    const entryName = basename(entry).split('.')[0]
    const outputBundle = bundle({ path: getPlatformPath(join(sourcePath, entry)) })

    const output = await esbuild.transform(outputBundle, {
      loader: 'ts',
      platform: 'node',
      target: 'ESNext',
      format: 'esm',
      tsconfigRaw: await readFile(join(__plugin_dirname, 'tsconfig.json'), { encoding: 'utf-8' }),
      minify: true,
      minifyIdentifiers: true,
      minifySyntax: true,
      minifyWhitespace: true
    })

    imports.push(`import * as ${entryName} from '${getPlatformPath(entry)}' with { type: 'text' }`)

    entryDev[basename(entry)] = outputBundle
    entryProd[basename(entry).replace('.ts', '.js')] = `// ${join('src', entry)}\n${output.code}`
  }

  return { imports, entryProd, entryDev }
}

async function generateDirectoryImports (directory: string): Promise<string[]> {
  const files = (await glob(`discord/${directory.toLowerCase()}/**/*.{ts,js}`, {
    cwd: sourcePath,
    dotRelative: false
  }))
  
  return [
    `\n// ${directory}`,
    ...files.map(file => 
      `import '${getPlatformPath(file)}'`
    )
  ]
}

export async function  build (filePath: string) {
  if (isPKG(filePath)) return
  
  const content = [
    'import { Entry } from \'socket-client\'',
    'import { Package } from \'utils\'',
    'import pkg from \'../package.json\''
  ]
  content.push('\nPackage.setData(pkg)')

  const { entryDev, entryProd } = await generateEntityImports()

  const formattedEntryDev = JSON.stringify(entryDev, null, 4)
    .replace(/'/g, '\\\'')
    .replace(/"/g, '\'')
    .replace(/\n\s*}$/, '\n  }')

  const formattedEntryProd = JSON.stringify(entryProd, null, 4)
    .replace(/'/g, '\\\'')
    .replace(/"/g, '\'')
    .replace(/\n\s*}$/, '\n  }')

  // content.push(...imports)
  content.push(`
Entry.setEntries({
  typescript: ${formattedEntryDev},
  javascript: ${formattedEntryProd}
})`)
    
  await Promise.all(DIRECTORIES.map(async (dirname) => {
    const imports = await generateDirectoryImports(dirname)
    content.push(...imports)
  }))
  
  await writeFile(join(sourcePath, 'register.ts'), content.join('\n'), { encoding: 'utf-8' })
}