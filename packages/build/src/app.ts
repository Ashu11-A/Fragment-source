import { glob } from 'glob'
import { basename, join, relative } from 'path'
import { __plugin_dirname, isPKG } from 'utils'
import { readFile, readdir, writeFile } from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'

const sourcePath = join(__plugin_dirname, 'src')
const DIRECTORIES = ['Commands', 'Components', 'Events', 'Configs', 'Crons'] as const

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
 * Descobre as classes de entidade e gera os imports para registro.
 */
async function generateEntitySection(): Promise<{ imports: string[]; registerCalls: string[] }> {
  const pattern = join(sourcePath, 'entity', '*.{ts,js}').replace(/\\/g, '/')
  const entries = await glob(pattern)
  const imports: string[] = []
  const registerCalls: string[] = []

  for (const entry of entries) {
    const identifier = basename(entry).split('.')[0]

    // Impede a geração de import para o arquivo index
    if (identifier === 'index') {
      continue
    }

    const relPath = getPlatformPath(relative(sourcePath, entry)).replace(/\.(ts|js)$/, '')

    imports.push(`import ${identifier} from '${relPath}'`)
    registerCalls.push(`  ctx.registerEntity(${identifier})`)
  }

  return { imports, registerCalls }
}

/**
 * Descobre os arquivos de cada diretório e gera os imports e chamadas de registro correspondentes.
 */
async function generateDirectorySection(
  directory: string
): Promise<{ imports: string[]; registerCalls: string[] }> {
  const allFiles = await glob(`discord/${directory.toLowerCase()}/**/*.{ts,js}`, {
    cwd: sourcePath,
    dotRelative: false,
  })
  // *Actions* são, em geral, anexados ao `Command` via `.action(…, bot)`; o Constatic
  // já regista o `Responder`. Não listar *Actions* aqui evita duplicar o mesmo handler.
  const files = allFiles.filter((file) => !basename(file).match(/Actions\.(ts|js)$/))

  const registerCalls: string[] = []

  const registerFn =
    directory === 'Commands'
      ? 'registerCreatedCommand'
      : directory === 'Components'
        ? 'registerCreatedResponder'
        : directory === 'Events'
          ? 'registerCreatedEvent'
          : null

  files.forEach((file, index) => {
    const identifier = `${directory.toLowerCase()}${index}`
    const relPath = getPlatformPath(file).replace(/\.(ts|js)$/, '')
    /** Import dinâmico para correr *depois* de `Package.setData(pkg)` no `registerAll`
     * (imports estáticos são hoistados e executavam antes, gerando `/undefined/…` nos customId). */
    const specifier = `${relPath}.js`

    if (registerFn !== null) {
      registerCalls.push(
        `  const { default: ${identifier} } = await import('${specifier}')\n  ${registerFn}(ctx, ${identifier})`,
      )
    } else {
      registerCalls.push(`  await (await import('${specifier}')).default(ctx)`)
    }
  })

  return { imports: [] as string[], registerCalls }
}

// ─── Dependency detection ──────────────────────────────────────────────────────

/**
 * Scans all TypeScript source files for `useDatabase('pluginName')` calls
 * and returns the unique set of referenced plugin names (excluding self).
 */
async function detectDatabaseDependencies(pluginRoot: string): Promise<string[]> {
  const selfPkg = JSON.parse(
    await readFile(join(pluginRoot, 'package.json'), 'utf-8')
  ) as Record<string, unknown>
  const selfKey = String(selfPkg['name'] ?? '').replace(/^plugin-/, '')

  const files = await glob('src/**/*.ts', {
    cwd: pluginRoot,
    absolute: true,
    ignore: [
      '**/node_modules/**',
      '**/src/register.ts',
      '**/src/build.ts',
      '**/src/types/dependencies.ts',
    ],
  })

  const found = new Set<string>()
  for (const file of files) {
    const content = await readFile(file, 'utf-8')
    for (const match of content.matchAll(/useDatabase\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      const name = match[1]!
      if (name !== selfKey) found.add(name)
    }
  }

  return [...found]
}

import type { ResolvedDep } from '@/types/index.js'

/**
 * For each dependency name, finds its plugin folder by reading sibling package.json files,
 * then returns name, version and path to entity/index.ts.
 */
async function resolveDependencies(pluginsDir: string, depNames: string[]): Promise<ResolvedDep[]> {
  if (depNames.length === 0) return []

  let siblings: string[] = []
  try {
    siblings = await readdir(pluginsDir)
  } catch {
    return []
  }

  // Map depName → plugin folder
  const folderMap = new Map<string, string>()
  for (const entry of siblings) {
    const pkgPath = join(pluginsDir, entry, 'package.json')
    if (!existsSync(pkgPath)) continue
    try {
      const pkg = JSON.parse(await readFile(pkgPath, 'utf-8')) as Record<string, unknown>
      const key = String(pkg['name'] ?? '').replace(/^plugin-/, '')
      if (key) folderMap.set(key, join(pluginsDir, entry))
    } catch { /* skip malformed package.json */ }
  }

  const resolved: ResolvedDep[] = []
  for (const name of depNames) {
    const folder = folderMap.get(name)
    if (!folder) {
      console.warn(`[Build] useDatabase('${name}') found but plugin "${name}" not located in ${pluginsDir} — skipping.`)
      continue
    }
    try {
      const pkg = JSON.parse(await readFile(join(folder, 'package.json'), 'utf-8')) as Record<string, unknown>
      const version = String(pkg['version'] ?? '0.0.0')
      const entityIndexPath = join(folder, 'src', 'entity', 'index.ts')
      if (!existsSync(entityIndexPath)) {
        console.warn(`[Build] Dependency "${name}" has no src/entity/index.ts — type import skipped.`)
        continue
      }
      resolved.push({ name, version, entityIndexPath })
    } catch {
      console.warn(`[Build] Could not read package.json for dependency "${name}" — skipping.`)
    }
  }

  return resolved
}

/**
 * Generates (or overwrites) src/types/dependencies.ts with type-only imports that
 * activate each dependency plugin's `declare module 'database'` augmentation.
 *
 * This makes TypeScript aware of the return type of `useDatabase('depName')` within
 * this plugin's compilation unit.
 */
async function generateDependenciesFile(pluginRoot: string, deps: ResolvedDep[]): Promise<void> {
  const typesDir = join(pluginRoot, 'src', 'types')
  mkdirSync(typesDir, { recursive: true })

  const lines = [
    '/** Auto-generated by the Fragment build system — do not edit manually. */',
    '/** Activates DatabaseRegistry augmentations from declared plugin dependencies. */',
  ]

  for (const dep of deps) {
    const relPath = relative(typesDir, dep.entityIndexPath).replace(/\\/g, '/')
    const importPath = relPath.startsWith('.') ? relPath : `./${relPath}`
    lines.push(`import type {} from '${importPath.replace(/\.ts$/, '.js')}'`)
  }

  if (deps.length === 0) {
    lines.push('// No external database dependencies detected.')
  }

  await writeFile(join(typesDir, 'dependencies.ts'), lines.join('\n') + '\n', 'utf-8')
}

/**
 * Updates package.json's `fragment.dependencies` field with the resolved dependency
 * list so that core can validate versions at runtime.
 */
async function updatePackageJsonFragment(pluginRoot: string, deps: ResolvedDep[]): Promise<void> {
  const pkgPath = join(pluginRoot, 'package.json')
  const pkg = JSON.parse(await readFile(pkgPath, 'utf-8')) as Record<string, unknown>

  const fragment = (pkg['fragment'] as Record<string, unknown> | undefined) ?? {}
  fragment['dependencies'] = deps.map(({ name, version }) => ({ name, version }))
  pkg['fragment'] = fragment

  await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8')
}

// ─── Entry point ──────────────────────────────────────────────────────────────

/**
 * Gera o arquivo src/register.ts exportando a função registerAll.
 * Também detecta dependências de banco de dados via useDatabase() e:
 *   1. Gera src/types/dependencies.ts com type imports para tipagem cross-plugin.
 *   2. Atualiza package.json com fragment.dependencies para validação em runtime.
 */
export async function build(filePath: string): Promise<void> {
  if (isPKG(filePath)) return

  const pluginRoot = join(filePath, '..')
  const pluginsDir = join(pluginRoot, '..')

  // ── Dependency detection ────────────────────────────────────────────────────
  const depNames = await detectDatabaseDependencies(pluginRoot)
  const resolvedDeps = await resolveDependencies(pluginsDir, depNames)

  await generateDependenciesFile(pluginRoot, resolvedDeps)
  await updatePackageJsonFragment(pluginRoot, resolvedDeps)

  if (resolvedDeps.length > 0) {
    console.log(`[Build] Database dependencies detected: ${resolvedDeps.map((d) => `${d.name}@${d.version}`).join(', ')}`)
  }

  // ── register.ts generation ─────────────────────────────────────────────────
  const allImports: string[] = [
    'import type { PluginContext } from \'discord\'',
    'import { Package } from \'utils\'',
    'import pkg from \'../package.json\'',
  ]
  const allRegisterCalls: string[] = []

  const { imports: entityImports, registerCalls: entityCalls } = await generateEntitySection()
  allImports.push(...entityImports)
  allRegisterCalls.push(...entityCalls)

  for (const dir of DIRECTORIES) {
    const { registerCalls } = await generateDirectorySection(dir)
    if (registerCalls.length > 0) {
      allRegisterCalls.push(`  // ${dir}`)
      allRegisterCalls.push(...registerCalls)
    }
  }

  const needCommand = allRegisterCalls.some((c) => c.includes('registerCreatedCommand'))
  const needEvent = allRegisterCalls.some((c) => c.includes('registerCreatedEvent'))
  const needResponder = allRegisterCalls.some((c) => c.includes('registerCreatedResponder'))
  if (needCommand || needEvent || needResponder) {
    const names = [
      ...(needCommand ? ['registerCreatedCommand'] : []),
      ...(needEvent ? ['registerCreatedEvent'] : []),
      ...(needResponder ? ['registerCreatedResponder'] : []),
    ]
    allImports.splice(
      1,
      0,
      `import { ${names.join(', ')} } from 'discord'`
    )
  }

  const content = [
    ...allImports,
    '',
    '/** Obrigatório antes de `new Plugin()` em app.ts: o construtor lê metadata via Package.getData(). */',
    'Package.setData(pkg)',
    '',
    '/** Gerado automaticamente — não edite manualmente. */',
    'export async function registerAll(ctx: PluginContext): Promise<void> {',
    ...allRegisterCalls,
    '}',
  ].join('\n')

  await writeFile(join(sourcePath, 'register.ts'), content, { encoding: 'utf-8' })
}