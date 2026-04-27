import { existsSync, readFileSync } from 'node:fs'
import { rm, writeFile } from 'node:fs/promises'
import { glob } from 'glob'
import { join } from 'node:path'
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
    path: 'core',
    type: BuildType.Binary,
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
    project.path = path
    const builder = new PluginBuilder(project)

    await builder.build()

    if (project.options?.signatureLength) {
      await builder.sign(join(process.cwd(), 'core/.fragment/privateKey.pem'))
      await builder.signCheck(join(process.cwd(), 'core/.fragment/publicKey.pem'))
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
