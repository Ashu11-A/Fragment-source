export type Metadata = {
  name: string
  version: string
  description: string
  author: string
  license: string
  api?: string
  /** Database dependencies captured at build time from package.json fragment.dependencies */
  dependencies?: Array<{ name: string; version: string }>
}

export type PackageType = Record<string, unknown>
