import { cp, mkdir, rm } from 'node:fs/promises'
import { glob } from 'glob'
import { join, basename } from 'node:path'
import { BuildType, type BuildMetadata } from '../types/index'
import { PluginBuilder } from '../builder'
import { logPlugin, logBuildLine } from './services'

const root = process.cwd()
const releasesDirectory = join(root, 'releases')
const corePluginsDirectory = join(root, 'core/plugins')
const pluginGlob = 'plugins/*'

const pluginBuildBase: Omit<BuildMetadata, 'path'> = {
  type: BuildType.File,
  options: {
    entryFile: 'src/app.ts',
    outputDirectory: releasesDirectory,
    buildArgs: ['--external=@ashu11a/constatic'],
  },
}

export async function rebuildPlugins(): Promise<void> {
  logPlugin('Rebuilding...')
  await rm(releasesDirectory, { recursive: true, force: true })
  await mkdir(releasesDirectory, { recursive: true })
  await rm(corePluginsDirectory, { recursive: true, force: true })
  await mkdir(corePluginsDirectory, { recursive: true })

  for (const pluginPath of await glob([pluginGlob], { cwd: root })) {
    const pluginName = basename(pluginPath)
    await new PluginBuilder({ ...pluginBuildBase, path: pluginPath })
      .build((line) => logBuildLine(`[${pluginName}] ${line}`))
  }

  for (const file of await glob('plugin-*.js', { cwd: releasesDirectory })) {
    await cp(join(releasesDirectory, file), join(corePluginsDirectory, file))
  }

  logPlugin('Done.')
}
