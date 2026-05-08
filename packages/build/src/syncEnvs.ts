/**
 * Reads releases/metadata.json and pushes each plugin's env var definitions
 * to the server via the admin TRPC endpoint.
 *
 * Usage:
 *   FRAGMENT_SERVER_URL=http://localhost:3000 \
 *   FRAGMENT_ADMIN_TOKEN=<jwt> \
 *   bun packages/build/src/syncEnvs.ts
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { pluginManifestSchema } from './types/index'

const metadataPath = join(process.cwd(), 'releases', 'metadata.json')
const raw = readFileSync(metadataPath, { encoding: 'utf-8' })

const releaseIndexSchema = z.object({
  plugins: z.array(z.object({
    name: z.string(),
    version: z.string(),
    manifest: pluginManifestSchema.optional(),
  })),
})

const index = releaseIndexSchema.parse(JSON.parse(raw))

const serverUrl = process.env['FRAGMENT_SERVER_URL'] ?? 'http://localhost:3000'
const adminToken = process.env['FRAGMENT_ADMIN_TOKEN']

if (!adminToken) {
  console.error('[syncEnvs] FRAGMENT_ADMIN_TOKEN is required')
  process.exit(1)
}

const trpcUrl = `${serverUrl}/trpc`

async function callTrpc<T>(procedure: string, input: T) {
  const res = await fetch(`${trpcUrl}/${procedure}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ json: input }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`TRPC ${procedure} failed (${res.status}): ${body}`)
  }

  const data = await res.json() as { result?: { data?: { json?: unknown } } }
  return data.result?.data?.json
}

// First get the list of plugin releases from the server
const pluginList = await callTrpc('plugins.list', {}) as Array<{
  id: number
  name: string
  releases: Array<{ id: number; version: string }>
}>

for (const pluginRelease of index.plugins) {
  const envs = pluginRelease.manifest?.envs
  if (!envs || envs.length === 0) continue

  // Match by bundle name pattern: plugin-<name>-<version>.js
  const namePart = pluginRelease.name.replace(/^plugin-/, '').replace(/-\d+\.\d+\.\d+\.js$/, '')

  const matchedPlugin = pluginList?.find((p) =>
    p.name.toLowerCase().replace(/\s+/g, '-') === namePart
    || p.name.toLowerCase() === namePart
  )

  if (!matchedPlugin) {
    console.warn(`[syncEnvs] No server plugin matched for "${pluginRelease.name}" (looked for "${namePart}")`)
    continue
  }

  const latestRelease = matchedPlugin.releases.sort((a, b) =>
    b.id - a.id
  )[0]

  if (!latestRelease) {
    console.warn(`[syncEnvs] Plugin "${matchedPlugin.name}" has no releases`)
    continue
  }

  await callTrpc('plugins.updateReleaseEnvs', {
    releaseId: latestRelease.id,
    envs,
  })

  console.log(`[syncEnvs] Updated ${envs.length} env var(s) for plugin "${matchedPlugin.name}" release #${latestRelease.id}`)
}

console.log('[syncEnvs] Done')
