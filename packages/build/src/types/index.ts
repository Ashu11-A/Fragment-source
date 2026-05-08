import { z } from 'zod'

export type ResolvedDep = {
  name: string
  version: string
  entityIndexPath: string
}

export enum BuildType {
  Binary = 0,
  File = 1,
  Directory = 2
}

export type BuildOptions = {
  entryFile: string
  outputDirectory: string
  name?: string
  buildArgs?: string[]
  signatureLength?: 256 | 512
}

export type BuildMetadata = {
  path: string
  type: BuildType
  release?: boolean
  prebuild?: boolean
  options: BuildOptions
}

export const subcommandManifestSchema = z.object({
  name: z.string(),
  description: z.string()
})

export const subcommandGroupManifestSchema = z.object({
  name: z.string(),
  description: z.string(),
  subcommands: z.array(subcommandManifestSchema)
})

export const envVarManifestSchema = z.object({
  name: z.string().min(1).max(256),
  description: z.string().max(2000),
  required: z.boolean().optional(),
  default: z.string().optional(),
  type: z.enum(['string', 'number', 'boolean', 'secret']).optional(),
})

export const pluginManifestSchema = z.object({
  metadata: z.object({
    name: z.string(),
    version: z.string(),
    description: z.string(),
    author: z.union([z.string(), z.object({ name: z.string(), email: z.string() })]),
    license: z.string(),
    dependencies: z.record(z.string(), z.string()).optional()
  }),
  commands: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    subcommands: z.array(subcommandManifestSchema),
    groups: z.array(subcommandGroupManifestSchema)
  })),
  components: z.array(z.object({ customId: z.string(), types: z.array(z.string()) })),
  events: z.array(z.object({ name: z.string(), event: z.string(), once: z.boolean() })),
  configs: z.array(z.string()),
  crons: z.array(z.object({ name: z.string(), cron: z.string(), once: z.boolean() })),
  envs: z.array(envVarManifestSchema),
  entities: z.array(z.string())
})

export type PluginManifest = z.infer<typeof pluginManifestSchema>

export type BuildRelease = {
  name: string
  version: string
  type: BuildType
  size: number
  sizeLabel: string
  md5: string
  sha256: string
  manifest?: PluginManifest
}

export type ReleaseIndex = {
  version: string
  publishedAt: string
  plugins: BuildRelease[]
  binaries: BuildRelease[]
}

export const packageJsonSchema = z.object({
  name: z.string(),
  version: z.string(),
  scripts: z.object({
    build: z.string().optional()
  }).optional()
})

export type ServiceName = 'server' | 'daemon' | 'dashboard'
export type ServiceStatus = 'idle' | 'running' | 'stopped' | 'error'

export type ServiceDefinition = {
  label: string
  badge: string
  cwd: string
  cmd: string
  args: string[]
}
