import { exec as execChild } from 'child_process'
import { existsSync } from 'fs'
import { mkdir } from 'fs/promises'
import { glob } from 'glob'
import { createSign, createVerify } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'path'

type PluginBuilderOptions = {
  directory: string
  entryFile: string
  outputDirectory: string
  name?: string
  buildArgs?: string[];
  signatureLength?: 256 | 512
}

class PluginBuilder {
  private readonly name: string
  private readonly buildArgs: string[] = []
  private readonly signatureLength: number = 512
  private readonly directory: string
  private readonly entryFile: string
  private readonly outputDirectory: string
  private readonly hasBuildScript: boolean
  private readonly outputFilePath: string

  constructor (options: PluginBuilderOptions) {
    this.directory = options.directory
    this.entryFile = options.entryFile
    this.outputDirectory = options.outputDirectory

    const packageJson = JSON.parse(readFileSync(join(this.directory, 'package.json'), { encoding: 'utf-8' }))
    
    this.name = `${packageJson.name}-${packageJson.version}`
    this.outputFilePath = join(this.outputDirectory, `/${this.name}.js`)
    this.hasBuildScript = Boolean(packageJson.scripts?.build)
  
    this.buildArgs.push(
      this.entryFile,
      '--bundle --platform=node --target=bun',
      '--minify --minify-syntax --minify-whitespace --minify-identifiers',
      '--no-sourcemap',
      ...options?.buildArgs ?? []
    )

    this.signatureLength = options?.signatureLength ?? this.signatureLength
  }
  
  async build (): Promise<'file' | 'directory'> {
    await this.exec('bun install')

    if (this.hasBuildScript) await this.exec('bun run build')
    if (!existsSync(this.outputDirectory)) await mkdir(this.outputDirectory, { recursive: true })

    try {
      await this.exec(`bun build ${this.buildArgs.join(' ')} --outfile=${this.outputFilePath}`)
      return 'file'
    } catch {
      await this.exec(`bun build ${this.buildArgs.join(' ')} --outdir=${this.outputFilePath}`)
      return 'directory'
    }
  }

  async sign (privateKeyPath: string): Promise<void> {  
    const binary = await readFile(this.outputFilePath)
    const privateKey = await readFile(privateKeyPath, { encoding: 'utf8' })
    
    const signer = createSign(`sha${this.signatureLength}`)
    signer.update(binary)
    signer.end()
    
    const signature = signer.sign(privateKey)
    await writeFile(join(this.outputDirectory, `/${this.name}.sig`), signature)
  }

  async singCheck (publicKeyPath: string): Promise<void> {
    const binary = await readFile(this.outputFilePath)

    const publicKey = await readFile(publicKeyPath)
    const signature = await readFile(join(this.outputDirectory, `/${this.name}.sig`))


    const verify = createVerify(`sha${this.signatureLength}`)
    verify.update(binary)
    verify.end()

    const isValid = verify.verify(publicKey, signature)

    if (isValid) {
      console.log('✅ Assinatura verificada com sucesso!')
    } else {
      throw new Error('❌ Falha na verificação da assinatura. O arquivo pode ter sido alterado.')
    }
  }

  private async exec (command: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = execChild(`cd ${this.directory} && ${command}`)

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

const projects = await glob(['plugins/*', 'packages/*', 'core'], { cwd: process.cwd() })

await rm('releases', { recursive: true })
for (const project of projects) {
  const builder = new PluginBuilder({
    directory: join(process.cwd(), project),
    entryFile: 'src/app.ts',
    signatureLength: 256,
    outputDirectory: join(process.cwd(), 'release'),
  })
  
  const buildType = await builder.build()
  if (buildType === 'file') {
    await builder.sign(join(process.cwd(), 'privateKey.pem'))
    await builder.singCheck(join(process.cwd(), 'publicKey.pem'))
  }
}