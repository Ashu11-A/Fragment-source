import { $ } from 'bun'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, rm, writeFile, readFile, cp } from 'node:fs/promises'
import { stripAnsi } from './utils'

function emitLines(log: (line: string) => void, buf: Buffer): void {
  for (const line of buf.toString().split('\n')) {
    const clean = stripAnsi(line).trimEnd()
    if (clean) log(clean)
  }
}
import { createHash, createSign, createVerify } from 'node:crypto'
import { basename, join } from 'node:path'
import { BuildType, type BuildMetadata, type BuildOptions, type BuildRelease, type PluginManifest, packageJsonSchema, pluginManifestSchema } from './types/index'
import { formatBytes } from './utils'

export class PluginBuilder {
  readonly name: string
  readonly version: string
  readonly buildArgs: string[] = []
  readonly buildDirectory: string
  readonly buildFilePath: string
  readonly releaseFilePath: string
  readonly hasBuildScript: boolean
  readonly metadata: Omit<BuildMetadata, 'options'>
  readonly options: BuildOptions

  constructor(options: BuildMetadata) {
    this.options = options.options
    this.metadata = options

    const rawPackageJson = readFileSync(join(this.metadata.path, 'package.json'), { encoding: 'utf-8' })
    const packageJson = packageJsonSchema.parse(JSON.parse(rawPackageJson))

    this.name = [
      packageJson.name,
      packageJson.version,
      this.metadata.type === BuildType.Binary
        ? process.platform === 'win32' ? 'windows' : process.platform
        : undefined,
      this.metadata.type === BuildType.Binary ? process.arch : undefined,
      this.metadata.type === BuildType.Binary
        ? process.platform === 'win32' ? '.exe' : undefined
        : undefined,
      this.metadata.type === BuildType.File ? '.js' : undefined,
    ].filter(Boolean).join('-').replace('-.', '.')

    this.version = packageJson.version
    this.buildDirectory = join(this.metadata.path, 'build')
    this.buildFilePath = join(this.buildDirectory, this.name)
    this.buildMapPath = this.buildFilePath + '.map'
    this.releaseFilePath = join(this.options.outputDirectory, this.name)
    this.hasBuildScript = Boolean(packageJson.scripts?.build)

    this.buildArgs.push(
      this.options.entryFile,
      '--bundle',
      '--target=bun',
      '--sourcemap',
      ...(options.options.buildArgs ?? []),
    )
  }

  async build(log?: (line: string) => void): Promise<PluginBuilder> {
    const cwd = this.metadata.path

    const run = async (shell: ReturnType<typeof $>): Promise<void> => {
      if (!log) { await shell; return }
      try {
        const result = await shell.quiet()
        emitLines(log, result.stdout)
        emitLines(log, result.stderr)
      } catch (err: unknown) {
        if (err && typeof err === 'object') {
          if ('stdout' in err) emitLines(log, (err as { stdout: Buffer }).stdout)
          if ('stderr' in err) emitLines(log, (err as { stderr: Buffer }).stderr)
        }
        throw err
      }
    }

    await run($`cd ${cwd} && bun install`)
    if (this.hasBuildScript) await run($`cd ${cwd} && bun run build`)

    if (!existsSync(this.buildDirectory)) {
      await mkdir(this.buildDirectory, { recursive: true })
    }

    switch (this.metadata.type) {
    case BuildType.Binary:
      await run($`cd ${cwd} && bun build ${this.buildArgs} --compile --outfile=${this.buildFilePath}`)
      break
    case BuildType.File: {
      await run($`cd ${cwd} && bun build ${this.buildArgs} --outdir=${this.buildDirectory}`)
      const generatedFile = join(this.buildDirectory, basename(this.options.entryFile).replace(/\.[^.]+$/, '.js'))
      const generatedMap = generatedFile + '.map'
      if (existsSync(generatedFile) && generatedFile !== this.buildFilePath) {
        await run($`mv ${generatedFile} ${this.buildFilePath}`)
        if (existsSync(generatedMap)) {
          await run($`mv ${generatedMap} ${this.buildMapPath}`)
        }
      }
      break
    }
    case BuildType.Directory:
      await run($`cd ${cwd} && bun build ${this.buildArgs} --outdir=${this.buildFilePath}`)
      break
    }

    return this
  }

  async inspect(): Promise<PluginManifest | null> {
    if (this.metadata.type !== BuildType.File) return null

    const timestamp = Date.now()
    const scriptName = `.fragment-inspect-${timestamp}.ts`
    const outputName = `.fragment-manifest-${timestamp}.json`
    const scriptPath = join(this.metadata.path, scriptName)

    const script = [
      'import \'reflect-metadata\'',
      `import plugin from './${this.options.entryFile}'`,
      'import { writeFile } from \'node:fs/promises\'',
      'const manifest = await plugin?.inspect?.()',
      `await writeFile('./${outputName}', JSON.stringify(manifest ?? null))`,
    ].join('\n')

    try {
      await writeFile(scriptPath, script)
      await $`cd ${this.metadata.path} && bun run ${scriptName}`
      const raw = await readFile(join(this.metadata.path, outputName), { encoding: 'utf-8' })
      const parsed: unknown = JSON.parse(raw)
      const validationResult = pluginManifestSchema.safeParse(parsed)
      return validationResult.success ? validationResult.data : null
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
    if (!existsSync(this.options.outputDirectory)) {
      await mkdir(this.options.outputDirectory, { recursive: true })
    }

    await cp(this.buildFilePath, this.releaseFilePath, { recursive: true })
    await rm(this.buildFilePath, { recursive: true, force: true })
    await rm(this.buildMapPath, { recursive: true, force: true }).catch(() => undefined)

    const file = await readFile(this.releaseFilePath)

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
    const binary = await readFile(this.releaseFilePath)
    const privateKey = await readFile(privateKeyPath, { encoding: 'utf8' })
    const signer = createSign(`sha${this.options.signatureLength}`)

    signer.update(new Uint8Array(binary.buffer))
    signer.end()

    const signature = signer.sign(privateKey)
    await writeFile(join(this.options.outputDirectory, `/${this.name}.sig`), new Uint8Array(signature.buffer))
  }

  async signCheck(publicKeyPath: string): Promise<void> {
    const binary = await readFile(this.releaseFilePath)
    const publicKey = await readFile(publicKeyPath)
    const signature = await readFile(join(this.options.outputDirectory, `/${this.name}.sig`))
    const verify = createVerify(`sha${this.options.signatureLength}`)

    verify.update(new Uint8Array(binary.buffer))
    verify.end()

    const isValid = verify.verify(publicKey, new Uint8Array(signature.buffer))

    if (isValid) {
      console.log('Assinatura verificada com sucesso!')
    } else {
      throw new Error('Falha na verificacao da assinatura. O arquivo pode ter sido alterado.')
    }
  }
}
