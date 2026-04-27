import { exec as execChild } from 'child_process'
import { existsSync } from 'fs'
import { rm, writeFile } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import { glob } from 'glob'
import { join } from 'path'
import { BuildType, PluginBuilder, type BuildMetadata, type BuildOptions, type BuildRelease, type PluginManifest } from './build'

const outputDirectory = join(process.cwd(), 'releases')

const options: BuildOptions = {
  entryFile: 'src/app.ts',
  outputDirectory,
}

// Garante um único ConstaticApp com o core (evita logs vazios no bootstrap).
const pluginBundleOptions: BuildOptions = {
  ...options,
  buildArgs: ['--external=@ashu11a/constatic'],
}

const projects: BuildMetadata[] = [
  {
    path: 'plugins/*',
    type: BuildType.File,
    release: true,
    prebuild: true,
    options: pluginBundleOptions,
  },
  {
    path: 'packages/*',
    type: BuildType.File,
    options,
  },
  {
    path: 'core',
    type: BuildType.Binary,
    release: true,
    options,
  },
]

export type ReleaseIndex = {
  version: string
  publishedAt: string
  plugins: BuildRelease[]
  binaries: BuildRelease[]
}

const pluginReleases: BuildRelease[] = []
const binaryReleases: BuildRelease[] = []

if (existsSync('releases') && !(process.env.BINARY || process.env.PREBUILD)) {
  await rm('releases', { recursive: true })
}

for (const project of projects) {
  if (
    (process.env['BINARY'] && project.type !== BuildType.Binary)
    || (process.env['PREBUILD'] && !project.prebuild)
  ) continue

  for (const path of await glob([project.path], { cwd: process.cwd() })) {
    project.path = path
    const builder = new PluginBuilder(project)

    await builder.build()

    if (project.options?.signatureLength) {
      await builder.sign(join(process.cwd(), 'core/privateKey.pem'))
      await builder.singCheck(join(process.cwd(), 'core/publicKey.pem'))
    }

    if (!project.release) continue

    const manifest = project.type === BuildType.File ? await builder.inspect() : undefined
    const release = await builder.release(manifest ?? undefined)

    if (project.type === BuildType.Binary) {
      binaryReleases.push(release)
    } else {
      pluginReleases.push(release)
    }
  }
}

const rootPackageJson = JSON.parse(
  readFileSync(join(process.cwd(), 'package.json'), { encoding: 'utf-8' })
) as { version: string }

const index: ReleaseIndex = {
  version: rootPackageJson.version,
  publishedAt: new Date().toISOString(),
  plugins: pluginReleases,
  binaries: binaryReleases,
}

await writeFile(join(outputDirectory, 'metadata.json'), JSON.stringify(index, null, 2), { encoding: 'utf-8' })

if (process.env.GITHUB_RELEASE) {
  await publishGithubRelease(outputDirectory, `v${rootPackageJson.version}`, index)
}

// ---------------------------------------------------------------------------
// GitHub Release
// ---------------------------------------------------------------------------

function generateReleaseNotes(releaseIndex: ReleaseIndex): string {
  const lines: string[] = [
    `## Fragment v${releaseIndex.version}`,
    '',
    `> Publicado em: ${new Date(releaseIndex.publishedAt).toLocaleDateString('pt-BR')}`,
    '',
  ]

  if (releaseIndex.plugins.length > 0) {
    lines.push('## Plugins', '')

    for (const plugin of releaseIndex.plugins) {
      const meta = plugin.manifest?.metadata
      lines.push(`### ${meta?.name ?? plugin.name} \`v${plugin.version}\``)
      if (meta?.description) lines.push('', `> ${meta.description}`)
      lines.push('')

      if (plugin.manifest?.commands.length) {
        lines.push('**Slash Commands**', '')
        for (const cmd of plugin.manifest.commands) {
          if (cmd.subcommands.length === 0 && cmd.groups.length === 0) {
            lines.push(`- \`/${cmd.name}\`${cmd.description ? ` — ${cmd.description}` : ''}`)
          } else {
            lines.push(`- \`/${cmd.name}\``)
            for (const sub of cmd.subcommands) {
              lines.push(`  - \`/${cmd.name} ${sub.name}\` — ${sub.description}`)
            }
            for (const group of cmd.groups) {
              lines.push(`  - \`/${cmd.name} ${group.name}\``)
              for (const sub of group.subcommands) {
                lines.push(`    - \`/${cmd.name} ${group.name} ${sub.name}\` — ${sub.description}`)
              }
            }
          }
        }
        lines.push('')
      }

      if (plugin.manifest?.components.length) {
        lines.push(`**Componentes** (${plugin.manifest.components.length})`, '')
        for (const component of plugin.manifest.components) {
          lines.push(`- \`${component.customId}\` [${component.types.join(', ')}]`)
        }
        lines.push('')
      }

      if (plugin.manifest?.events.length) {
        lines.push(`**Eventos** (${plugin.manifest.events.length})`, '')
        for (const event of plugin.manifest.events) {
          lines.push(`- \`${event.event}\`${event.once ? ' *(once)*' : ''}`)
        }
        lines.push('')
      }

      if (plugin.manifest?.crons.length) {
        lines.push(`**Crons** (${plugin.manifest.crons.length})`, '')
        for (const cron of plugin.manifest.crons) {
          lines.push(`- \`${cron.name}\` — \`${cron.cron}\`${cron.once ? ' *(once)*' : ''}`)
        }
        lines.push('')
      }

      if (plugin.manifest?.entities.length) {
        lines.push(`**Entidades DB**: ${plugin.manifest.entities.join(', ')}`, '')
      }

      lines.push(`**Tamanho**: ${plugin.sizeLabel} | **SHA-256**: \`${plugin.sha256.slice(0, 16)}...\``, '')
    }
  }

  if (releaseIndex.binaries.length > 0) {
    lines.push('## Binários', '')
    for (const binary of releaseIndex.binaries) {
      lines.push(`### ${binary.name}`, '')
      lines.push(`**Tamanho**: ${binary.sizeLabel} | **SHA-256**: \`${binary.sha256.slice(0, 16)}...\``, '')
    }
  }

  return lines.join('\n')
}

async function publishGithubRelease(
  releasesDir: string,
  tag: string,
  releaseIndex: ReleaseIndex,
): Promise<void> {
  const assetPaths = [
    ...releaseIndex.plugins.map(plugin => join(releasesDir, plugin.name)),
    ...releaseIndex.binaries.map(binary => join(releasesDir, binary.name)),
    join(releasesDir, 'metadata.json'),
  ].filter(existsSync)

  const notes = generateReleaseNotes(releaseIndex)
  const notesPath = join(releasesDir, '.release-notes.tmp.md')

  await writeFile(notesPath, notes, { encoding: 'utf-8' })

  try {
    await new Promise<void>((resolve, reject) => {
      const assetArgs = assetPaths.map(assetPath => `"${assetPath}"`).join(' ')
      const command = `gh release create ${tag} ${assetArgs} --title "Fragment ${tag}" --notes-file "${notesPath}"`

      const child = execChild(command)
      if (child.stdout) child.stdout.on('data', (output: string) => console.log(output))
      if (child.stderr) child.stderr.on('data', (output: string) => console.error(output))
      child.on('close', (code) => {
        if (code !== 0) return reject(new Error(`gh release create falhou com código ${code}`))
        resolve()
      })
    })
  } finally {
    await rm(notesPath).catch(() => undefined)
  }
}
