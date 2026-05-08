import { existsSync, readFileSync } from 'node:fs'
import { rm, writeFile } from 'node:fs/promises'
import { glob } from 'glob'
import { join, resolve } from 'node:path'
import { z } from 'zod'
import { PluginBuilder } from './builder'
import { BuildType, type BuildMetadata, type BuildOptions, type BuildRelease, type ReleaseIndex } from './types/index'
import { publishGithubRelease } from './release/github'

const outputDirectory = join(process.cwd(), 'releases')

const options: BuildOptions = {
  entryFile: 'src/app.ts',
  outputDirectory,
}

const pluginBundleOptions: BuildOptions = {
  ...options,
  // Plugins run inside core's process and share its typeorm/reflect-metadata instances.
  buildArgs: ['--external=typeorm', '--external=reflect-metadata', '--external=@ashu11a/constatic'],
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
    path: 'core',
    type: BuildType.Binary,
    release: true,
    options: {
      ...options,
      buildArgs: ['--external=typeorm', '--external=reflect-metadata'],
    },
  },
  {
    path: 'core',
    type: BuildType.File,
    release: true,
    options,
  },
]

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
    const metadata = { ...project, path: resolve(path) }
    const builder = new PluginBuilder(metadata)

    await builder.build()

    if (metadata.options?.signatureLength) {
      await builder.sign(join(process.cwd(), 'core/.fragment/privateKey.pem'))
      await builder.signCheck(join(process.cwd(), 'core/.fragment/publicKey.pem'))
    }

    if (!metadata.release) continue

    const manifest = project.path.startsWith('plugins/') && metadata.type === BuildType.File
      ? await builder.inspect()
      : undefined
    const release = await builder.release(manifest ?? undefined)

    if (project.path === 'core') {
      binaryReleases.push(release)
    } else {
      pluginReleases.push(release)
    }
  }
}

const rootPackageJsonSchema = z.object({ version: z.string() })
const rawRootPackageJson = readFileSync(join(process.cwd(), 'package.json'), { encoding: 'utf-8' })
const rootPackageJson = rootPackageJsonSchema.parse(JSON.parse(rawRootPackageJson))

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
