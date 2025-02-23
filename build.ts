import { exec as execChild } from 'child_process'
import { existsSync } from 'fs'
import { mkdir } from 'fs/promises'
import { glob } from 'glob'
import { createHash, createSign, createVerify } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'path'

type BuildOptions = {
  entryFile: string
  outputDirectory: string
  name?: string
  buildArgs?: string[];
  signatureLength?: 256 | 512
}

enum BuildType {
  Binary = 0,
  File = 1,
  Directory = 2
}

type BuildMetadata = {
  path: string
  type: BuildType
  release?: boolean
  options: BuildOptions
}

type BuildRelease = {
  name: string
  version: string
  size: number
  sizeLabel: string
  md5: string
  sha265: string
}

function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

class PluginBuilder {
  readonly name: string
  readonly version: string
  readonly buildArgs: string[] = []
  readonly outputFilePath: string
  readonly hasBuildScript: boolean
  readonly metadata: Omit<BuildMetadata, 'options'>
  readonly options: BuildOptions

  constructor (options: BuildMetadata) {
    this.options = options.options
    this.metadata = options
    const packageJson = JSON.parse(readFileSync(join(this.metadata.path, 'package.json'), { encoding: 'utf-8' }))
    
    this.name = `${packageJson.name}-${packageJson.version}`
    this.version = packageJson.version
    this.outputFilePath = join(this.options.outputDirectory, `/${this.name}${this.metadata.type === BuildType.File ? '.js': ''}`)
    this.hasBuildScript = Boolean(packageJson.scripts?.build)
  
    this.buildArgs.push(
      this.options.entryFile,
      '--bundle --target=bun',
      // '--minify --minify-syntax --minify-whitespace --minify-identifiers',
      '--no-sourcemap',
      ...options?.options.buildArgs ?? [],
    )
  }
  
  async build (): Promise<PluginBuilder> {
    await this.exec('bun install')

    if (this.hasBuildScript) await this.exec('bun run build')
    if (!existsSync(this.options.outputDirectory)) await mkdir(this.options.outputDirectory, { recursive: true })

    switch (this.metadata.type) {
    case BuildType.Binary: {
      await this.exec(`bun build ${this.buildArgs.join(' ')} --compile --outfile=${join(this.options.outputDirectory, this.name)}`)
      break
    }
    case BuildType.File: {
      await this.exec(`bun build ${this.buildArgs.join(' ')} --outfile=${this.outputFilePath}`)
      break
    }
    case BuildType.Directory: {
      await this.exec(`bun build ${this.buildArgs.join(' ')} --outdir=${this.outputFilePath}`)
      break
    }
    }

    return this
  }

  async release () {
    const file = await readFile(this.outputFilePath)

    return {
      name: this.name,
      version: this.version,
      size: file.byteLength,
      sizeLabel: formatBytes(file.byteLength),
      sha265: createHash('sha256').update(file).digest('hex'),
      md5: createHash('md5').update(file).digest('hex'),
    } satisfies BuildRelease
  }

  async sign (privateKeyPath: string): Promise<void> {  
    const binary = await readFile(this.outputFilePath)
    const privateKey = await readFile(privateKeyPath, { encoding: 'utf8' })
    const signer = createSign(`sha${this.options.signatureLength}`)

    signer.update(new Uint8Array(binary.buffer))
    signer.end()
    
    const signature = signer.sign(privateKey)
    await writeFile(join(this.options.outputDirectory, `/${this.name}.sig`), new Uint8Array(signature.buffer))
  }

  async singCheck (publicKeyPath: string): Promise<void> {
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

  private async exec (command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = execChild(`cd ${this.metadata.path} && ${command}`)

      if (child.stdout) child.stdout.on('data', (output) => console.log(output))
      if (child.stderr) child.stderr.on('data', (output) => console.error(output))

      child.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`Command failed: ${command}`))
        }
    
        return resolve()
      })
    })
  }
}

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

if (existsSync('releases')) await rm('releases', { recursive: true })
for (const project of projects) {
  if (process.env['RELEASE'] && !project.release) continue

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

await writeFile(join(outputDirectory, 'metadata.json'), JSON.stringify(releases, null, 2))