import { writeFile } from 'fs/promises'
import { glob } from 'glob'
import { basename, join } from 'path'
import { __plugin_dirname, isPKG } from 'utils'

const sourcePath = join(__plugin_dirname, 'src')
const DIRECTORIES = ['Commands', 'Events', 'Components', 'Configs', 'Crons'] as const

function getPlatformPath (path: string): string {
  const isWindows = process.platform === 'win32'
  
  if (!path.startsWith('../')) {
    return isWindows ? `.\\${path}` : `./${path}`
  }
  
  return isWindows ? path.replaceAll(/\\/g, '\\\\') : path
}

async function generateEntityImports(): Promise<[string[], Record<string, string>]> {
  const entries = (await glob('entity/*', { cwd: sourcePath }))
  const imports: string[] = []
  const entryMap: Record<string, string> = {}

  for (const entry of entries) {
    const entryName = basename(entry).split('.')[0]

    imports.push(`import * as ${entryName} from '${getPlatformPath(entry)}' with { type: 'text' }`)
    entryMap[basename(entry)] = entryName
  }

  return [imports, entryMap]
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
  content.push('Package.setData(pkg)')

  const [entityImports, entryMap] = await generateEntityImports()
  content.push(...entityImports)
  content.push(`
Entry.setEntries({
${Object.entries(entryMap)
    .map(([entry, variable]) => `  '${entry}': ${variable} as unknown as string,`)
    .join('\n')}
})`)
    
  await Promise.all(DIRECTORIES.map(async (dirname) => {
    const imports = await generateDirectoryImports(dirname)
    content.push(...imports)
  }))
  
  await writeFile(join(sourcePath, 'register.ts'), content.join('\n'), { encoding: 'utf-8' })
}