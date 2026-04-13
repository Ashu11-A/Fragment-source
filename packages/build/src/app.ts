import { glob } from 'glob'
import { basename, join, relative } from 'path'
import { __plugin_dirname, isPKG } from 'utils'
import { writeFile } from 'fs/promises'

const sourcePath = join(__plugin_dirname, 'src')
const DIRECTORIES = ['Commands', 'Events', 'Components', 'Configs', 'Crons'] as const

export function getPlatformPath(path: string): string {
  const isWindows = process.platform === 'win32'
  if (!path.startsWith('../') && !/^[a-zA-Z]:/.test(path) && !path.startsWith('/')) {
    path = isWindows ? `.\\${path}` : `./${path}`
  }
  return isWindows
    ? path.replaceAll('/', '\\').replace(/\\/g, '\\\\')
    : path
}

/**
 * Discover entity classes in `src/entity/` and generate the import + registration lines.
 *
 * Entity classes are imported directly (no serialisation to strings) and passed
 * to ctx.registerEntity() so core can add them to its DataSource at load time.
 */
async function generateEntitySection(): Promise<{ imports: string[]; registerCalls: string[] }> {
  const pattern = join(sourcePath, 'entity', '*.{ts,js}').replace(/\\/g, '/')
  const entries = await glob(pattern)
  const imports: string[] = []
  const registerCalls: string[] = []

  for (const entry of entries) {
    const identifier = basename(entry).split('.')[0]
    const relPath = getPlatformPath(relative(sourcePath, entry))
    imports.push(`import ${identifier} from '${relPath}'`)
    registerCalls.push(`  ctx.registerEntity(${identifier})`)
  }

  return { imports, registerCalls }
}

/**
 * For each plugin directory (Commands, Events, Components, Configs, Crons):
 *  - Discover files under `src/discord/<dir>/`
 *  - Generate a named import and a call to the exported default function
 *
 * Each plugin file must export a default function `(ctx: PluginContext) => void`.
 */
async function generateDirectorySection(
  directory: string
): Promise<{ imports: string[]; registerCalls: string[] }> {
  const files = await glob(`discord/${directory.toLowerCase()}/**/*.{ts,js}`, {
    cwd: sourcePath,
    dotRelative: false,
  })

  const imports: string[] = []
  const registerCalls: string[] = []

  files.forEach((file, index) => {
    const identifier = `${directory.toLowerCase()}${index}`
    const relPath = getPlatformPath(file)
    imports.push(`import ${identifier} from '${relPath}'`)
    registerCalls.push(`  ${identifier}(ctx)`)
  })

  return { imports, registerCalls }
}

/**
 * Generate `src/register.ts` for the plugin that is currently building.
 *
 * The generated file exports a single `registerAll(ctx: PluginContext)` function
 * that registers all commands, events, components, configs, crons and entities
 * with the core-provided context.  No socket-client or Discord token needed.
 */
export async function build(filePath: string): Promise<void> {
  if (isPKG(filePath)) return

  const allImports: string[] = [
    'import type { PluginContext } from \'discord\'',
    'import { Package } from \'utils\'',
    'import pkg from \'../package.json\'',
  ]
  const allRegisterCalls: string[] = []

  // Package metadata (needed for component customId namespacing etc.)
  allImports.push('\nPackage.setData(pkg)')

  // Entities
  const { imports: entityImports, registerCalls: entityCalls } = await generateEntitySection()
  allImports.push(...entityImports)
  allRegisterCalls.push(...entityCalls)

  // Discord directories
  for (const dir of DIRECTORIES) {
    const { imports, registerCalls } = await generateDirectorySection(dir)
    if (imports.length > 0) {
      allImports.push(`\n// ${dir}`)
      allImports.push(...imports)
      allRegisterCalls.push(...registerCalls)
    }
  }

  const content = [
    ...allImports,
    '',
    '/** Auto-generated — do not edit manually. Re-run the build script to regenerate. */',
    'export async function registerAll(ctx: PluginContext): Promise<void> {',
    ...allRegisterCalls,
    '}',
  ].join('\n')

  await writeFile(join(sourcePath, 'register.ts'), content, { encoding: 'utf-8' })
}
