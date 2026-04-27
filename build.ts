import { exec as execChild } from 'child_process'
import { existsSync } from 'fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { createHash, createSign, createVerify } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'path'

export type BuildOptions = {
  entryFile: string
  outputDirectory: string
  name?: string
  buildArgs?: string[]
  signatureLength?: 256 | 512
}

export enum BuildType {
  Binary = 0,
  File = 1,
  Directory = 2
}

export type BuildMetadata = {
  path: string
  type: BuildType
  release?: boolean
  prebuild?: boolean
  options: BuildOptions
}

type SubcommandManifest = { name: string; description: string }
type SubcommandGroupManifest = { name: string; description: string; subcommands: SubcommandManifest[] }

export type PluginManifest = {
  metadata: {
    name: string
    version: string
    description: string
    author: string | { name: string; email: string }
    license: string
    frameworkVersion: string
    dependencies?: Array<{ name: string; version: string }>
  }
  commands: Array<{
    name: string
    description?: string
    subcommands: SubcommandManifest[]
    groups: SubcommandGroupManifest[]
  }>
  components: Array<{ customId: string; types: string[] }>
  events: Array<{ name: string; event: string; once: boolean }>
  configs: string[]
  crons: Array<{ name: string; cron: string; once: boolean }>
  entities: string[]
}

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

function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const index = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, index)).toFixed(decimals))} ${sizes[index]}`
}

export class PluginBuilder {
  readonly name: string
  readonly version: string
  readonly buildArgs: string[] = []
  readonly outputFilePath: string
  readonly hasBuildScript: boolean
  readonly metadata: Omit<BuildMetadata, 'options'>
  readonly options: BuildOptions

  constructor(options: BuildMetadata) {
    this.options = options.options
    this.metadata = options
    console.log(this.metadata.path)
    const packageJson = JSON.parse(readFileSync(join(this.metadata.path, 'package.json'), { encoding: 'utf-8' }))

    this.name = [
      packageJson.name,
      packageJson.version,
      this.metadata.type === BuildType.Binary
        ? process.platform === 'win32' ? 'windows' : process.platform
        : undefined,
      this.metadata.type === BuildType.Binary
        ? process.arch
        : undefined,
      this.metadata.type === BuildType.Binary
        ? process.platform === 'win32' ? '.exe' : undefined
        : undefined,
      this.metadata.type === BuildType.File
        ? '.js'
        : undefined,
    ].filter(Boolean).join('-').replace('-.', '.')
    this.version = packageJson.version
    this.outputFilePath = join(this.options.outputDirectory, this.name)
    this.hasBuildScript = Boolean(packageJson.scripts?.build)

    this.buildArgs.push(
      this.options.entryFile,
      '--bundle --target=bun',
      '--no-sourcemap',
      // TypeORM único: core resolve estes do seu node_modules em runtime.
      // Bundlar typeorm no plugin duplica MetadataArgsStorage e quebra DataSource.initialize().
      '--external=typeorm',
      '--external=reflect-metadata',
      ...options?.options.buildArgs ?? [],
    )
  }

  async build(): Promise<PluginBuilder> {
    await this.exec('bun install')
    if (this.hasBuildScript) await this.exec('bun run build')
    if (!existsSync(this.options.outputDirectory)) await mkdir(this.options.outputDirectory, { recursive: true })

    switch (this.metadata.type) {
    case BuildType.Binary:
      await this.exec(`bun build ${this.buildArgs.join(' ')} --compile --outfile=${join(this.options.outputDirectory, this.name)}`)
      break
    case BuildType.File:
      await this.exec(`bun build ${this.buildArgs.join(' ')} --outfile=${this.outputFilePath}`)
      break
    case BuildType.Directory:
      await this.exec(`bun build ${this.buildArgs.join(' ')} --outdir=${this.outputFilePath}`)
      break
    }

    return this
  }

  /**
   * Executa Plugin.inspect() no plugin via um script Bun temporário isolado no
   * diretório do plugin, escrevendo o resultado em um JSON sidecar para evitar
   * que logs do setup poluam a saída capturada.
   */
  async inspect(): Promise<PluginManifest | null> {
    if (this.metadata.type !== BuildType.File) return null

    const timestamp = Date.now()
    const scriptName = `.fragment-inspect-${timestamp}.ts`
    const outputName = `.fragment-manifest-${timestamp}.json`
    const scriptPath = join(this.metadata.path, scriptName)

    const script = [
      `import 'reflect-metadata'`,
      `import plugin from './${this.options.entryFile}'`,
      `import { writeFile } from 'node:fs/promises'`,
      `const manifest = await plugin?.inspect?.()`,
      `await writeFile('./${outputName}', JSON.stringify(manifest ?? null))`,
    ].join('\n')

    try {
      await writeFile(scriptPath, script)
      await this.exec(`bun run ${scriptName}`)
      const raw = await readFile(join(this.metadata.path, outputName), { encoding: 'utf-8' })
      const parsed: unknown = JSON.parse(raw)
      return parsed !== null ? (parsed as PluginManifest) : null
    } catch {
      return null
    } finally {
      await Promise.all([
        rm(scriptPath).catch(() => undefined),
        rm(join(this.metadata.path, outputName)).catch(() => undefined),
      ])
    }
  }

  async release(manifest?: PluginManifest): Promise<BuildRelease> {
    const file = await readFile(this.outputFilePath)
    return {
      name: this.name,
      version: this.version,
      type: this.metadata.type,
      size: file.byteLength,
      sizeLabel: formatBytes(file.byteLength),
      sha256: createHash('sha256').update(file).digest('hex'),
      md5: createHash('md5').update(file).digest('hex'),
      ...(manifest !== undefined && { manifest }),
    } satisfies BuildRelease
  }

  async sign(privateKeyPath: string): Promise<void> {
    const binary = await readFile(this.outputFilePath)
    const privateKey = await readFile(privateKeyPath, { encoding: 'utf8' })
    const signer = createSign(`sha${this.options.signatureLength}`)
    signer.update(new Uint8Array(binary.buffer))
    signer.end()
    const signature = signer.sign(privateKey)
    await writeFile(join(this.options.outputDirectory, `/${this.name}.sig`), new Uint8Array(signature.buffer))
  }

  async singCheck(publicKeyPath: string): Promise<void> {
    const binary = await readFile(this.outputFilePath)
    const publicKey = await readFile(publicKeyPath)
    const signature = await readFile(join(this.options.outputDirectory, `/${this.name}.sig`))
    const verify = createVerify(`sha${this.options.signatureLength}`)
    verify.update(new Uint8Array(binary.buffer))
    verify.end()
    const isValid = verify.verify(publicKey, new Uint8Array(signature.buffer))
    if (isValid) {
      console.log('✅ Assinatura verificada com sucesso!')
    } else {
      throw new Error('❌ Falha na verificação da assinatura. O arquivo pode ter sido alterado.')
    }
  }

  private exec(command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = execChild(`cd ${this.metadata.path} && ${command}`)
      if (child.stdout) child.stdout.on('data', (output: string) => console.log(output))
      if (child.stderr) child.stderr.on('data', (output: string) => console.error(output))
      child.on('close', (code) => {
        if (code !== 0) return reject(new Error(`Command failed: ${command}`))
        resolve()
      })
    })
  }
}
