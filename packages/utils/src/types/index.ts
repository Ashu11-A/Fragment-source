export type Metadata = {
  name: string
  version: string
  description: string
  author: string
  license: string
  api?: string
  /** Dependencies on other plugins, including the core framework */
  dependencies?: Record<string, string>
}

export type PackageType = Record<string, unknown>
