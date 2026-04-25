import { TRPCError } from '@trpc/server'

const DEFAULT_REPO = String(process.env['GITHUB_RELEASES_REPO'] ?? 'Ashu11-A/Fragment-source')
const DEFAULT_TAG = String(process.env['GITHUB_RELEASES_DEFAULT_TAG'] ?? 'v0.0.5-canary')
const GITHUB_API = 'https://api.github.com'
const USER_AGENT = 'Fragment-Server/1.0'
const CACHE_MS = 5 * 60 * 1000

export type ArtifactKind = 'core' | 'plugin' | 'metadata' | 'other'

export interface GithubAsset {
  id: number
  name: string
  size: number
  content_type: string
  browser_download_url: string
}

export interface GithubRelease {
  tag_name: string
  name: string
  published_at: string
  body: string
  html_url: string
  assets: GithubAsset[]
}

const releaseCache = new Map<string, { at: number; data: GithubRelease }>()

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': USER_AGENT,
  }
  const token = process.env['GITHUB_TOKEN']
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

async function ghFetch(path: string): Promise<Response> {
  const res = await fetch(`${GITHUB_API}${path}`, { headers: authHeaders() })
  return res
}

export function getDefaultReleaseTag(): string {
  return DEFAULT_TAG
}

export function getReleasesRepo(): string {
  return DEFAULT_REPO
}

export function classifyArtifact(name: string): ArtifactKind {
  if (name === 'metadata.json') return 'metadata'
  if (name.startsWith('core-')) return 'core'
  if (name.startsWith('plugin-') && name.endsWith('.js')) return 'plugin'
  return 'other'
}

/** Nome amigável do plugin a partir de `plugin-base-1.0.0.js` → "base" */
export function pluginSlugFromFileName(name: string): string | null {
  const m = name.match(/^plugin-([^-]+)-/)
  return m?.[1] ?? null
}

export async function fetchReleaseByTag(tag: string, bustCache = false): Promise<GithubRelease> {
  const repo = DEFAULT_REPO
  if (!bustCache) {
    const hit = releaseCache.get(tag)
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.data
  }

  const res = await ghFetch(
    `/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`,
  )
  if (res.status === 404) {
    throw new TRPCError({ code: 'NOT_FOUND', message: `Release "${tag}" not found on GitHub.` })
  }
  if (!res.ok) {
    const t = await res.text()
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `GitHub API error: ${res.status} ${t.slice(0, 200)}`,
    })
  }

  const data = (await res.json()) as GithubRelease
  releaseCache.set(tag, { at: Date.now(), data })
  return data
}

export interface ReleaseSummary {
  tagName: string
  name: string
  publishedAt: string
  htmlUrl: string
  draft: boolean
  prerelease: boolean
}

export async function listRecentReleases(perPage: number): Promise<ReleaseSummary[]> {
  const repo = DEFAULT_REPO
  const res = await ghFetch(`/repos/${repo}/releases?per_page=${perPage}`)
  if (!res.ok) {
    const t = await res.text()
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `GitHub list releases error: ${res.status} ${t.slice(0, 200)}`,
    })
  }
  const list = (await res.json()) as {
    tag_name: string
    name: string
    published_at: string
    html_url: string
    draft: boolean
    prerelease: boolean
  }[]
  return list
    .filter((r) => !r.draft)
    .map((r) => ({
      tagName: r.tag_name,
      name: r.name,
      publishedAt: r.published_at,
      htmlUrl: r.html_url,
      draft: r.draft,
      prerelease: r.prerelease,
    }))
}

export async function getAssetById(
  tag: string,
  assetId: number,
): Promise<{ asset: GithubAsset; downloadUrl: string }> {
  const rel = await fetchReleaseByTag(tag)
  const asset = rel.assets.find((a) => a.id === assetId)
  if (!asset) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Asset not found in this release.' })
  }
  return { asset, downloadUrl: asset.browser_download_url }
}

export function clearReleaseCache() {
  releaseCache.clear()
}
