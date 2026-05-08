import { $ } from 'bun'
import { existsSync } from 'node:fs'
import { rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { type ReleaseIndex } from '../types'
import { generateReleaseNotes } from './notes'

export async function publishGithubRelease(
  releasesDirectory: string,
  tag: string,
  releaseIndex: ReleaseIndex,
): Promise<void> {
  const assetPaths = [
    ...releaseIndex.plugins.map(plugin => join(releasesDirectory, plugin.name)),
    ...releaseIndex.binaries.map(binary => join(releasesDirectory, binary.name)),
    join(releasesDirectory, 'metadata.json'),
  ].filter(existsSync)

  const notes = generateReleaseNotes(releaseIndex)
  const notesPath = join(releasesDirectory, '.release-notes.tmp.md')

  await writeFile(notesPath, notes, { encoding: 'utf-8' })

  try {
    await $`gh release create ${tag} ${assetPaths} --title ${`Fragment ${tag}`} --notes-file ${notesPath}`
  } finally {
    await rm(notesPath).catch(() => undefined)
  }
}
