import { existsSync } from 'fs'
import { appendFile, rm } from 'fs/promises'
import { glob } from 'glob'
import { join } from 'path'
import { BuildType, PluginBuilder, type BuildMetadata, type BuildOptions, type BuildRelease } from './build'

const outputDirectory = join(process.cwd(), 'releases')
const options: BuildOptions = {
  entryFile: 'src/app.ts',
  // signatureLength: 256,
  outputDirectory,
}

const projects: BuildMetadata[] = [
  {
    path: 'plugins/*',
    type: BuildType.File,
    release: true,
    prebuild: true,
    options
  },
  {
    path: 'packages/*',
    type: BuildType.File,
    options
  },
  {
    path: 'core',
    type: BuildType.Binary,
    release: true,
    options
  }
]

const releases: BuildRelease[] = []

if (existsSync('releases') && !(process.env.BINARY || process.env.PREBUILD)) {
  await rm('releases', { recursive: true })
}

for (const project of projects) {
  if (
    (process.env['BINARY'] && !(project.type === BuildType.Binary))
    || (process.env['PREBUILD'] && !project.prebuild)) continue

  for (const path of await glob([project.path], { cwd: process.cwd() })) {
    project.path = path
    const builder = new PluginBuilder(project)

    await builder.build()
    if (project.options?.signatureLength) {
      await builder.sign(join(process.cwd(), 'core/privateKey.pem'))
      await builder.singCheck(join(process.cwd(), 'core/publicKey.pem'))
    }

    releases.push(await builder.release())
  }
}

await appendFile(join(outputDirectory, 'metadata.json'), JSON.stringify(releases, null, 2), { encoding: 'utf-8' })