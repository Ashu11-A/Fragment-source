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

export interface ReleaseSummary {
  tagName: string
  name: string
  publishedAt: string
  htmlUrl: string
  draft: boolean
  prerelease: boolean
}
