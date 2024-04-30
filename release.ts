import { exec } from '@yao-pkg/pkg'
import { Presets, SingleBar } from 'cli-progress'
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'fs'
import { readFile, rmdir, writeFile } from 'fs/promises'
import { obfuscate } from 'javascript-obfuscator'
import { Loggings } from 'loggings'
import os from 'os'
import path from 'path'
import { generate } from 'randomstring'
import { minify } from 'terser'
import { formatBytes } from './src/functions/Format'
import { createHash } from 'crypto'

interface BuildType {
  path: string
  pathBuild: string
  platforms: Array<'linux' | 'alpine' | 'linuxstatic' | 'macos'>
  archs: Array<'x64' | 'arm64'>
  nodeVersion: '18' | '20'
  removePaths?: boolean
}

interface BuildInfo {
  path: string
  platform: string
  arch: string
  size: string
  timeBuild: string
  hashMD5: string
  hashSHA: string
}

type BuildManifest = Record<string, BuildInfo>

class Build {
  files: Record<string, string> = {}
  private readonly path
  private readonly pathBuild
  private readonly platforms
  private readonly archs
  private readonly nodeVersion
  private readonly removePaths: boolean

  private readonly filesCompress: Array<Record<string, string | undefined >> = []

  private readonly core: Loggings
  private readonly seed: number
  private readonly progressBar

  constructor ({ archs, nodeVersion, path, pathBuild, platforms, removePaths = false }: BuildType) {
    this.path = path
    this.pathBuild = pathBuild
    this.platforms = platforms
    this.archs = archs
    this.nodeVersion = nodeVersion
    this.removePaths = removePaths

    this.progressBar = new SingleBar({}, Presets.rect)
    this.core = new Loggings()
    this.seed = Math.random()
  }

  async start (): Promise<void> {
    await this.loadFiles()
    await this.compress()
    await this.obfuscate()
    await this.initialConfig()
    await this.release()
    if (this.removePaths) await this.remove()
  }

  async loadFiles (): Promise<void> {
    const files: Record<string, string> = {}

    function scanDirectory (diretorio: string): void {
      readdirSync(diretorio).forEach((file) => {
        const fullPath = path.join(diretorio, file)

        if (lstatSync(fullPath).isDirectory()) {
          scanDirectory(fullPath)
        } else if (path.extname(fullPath) === '.js' || path.extname(fullPath) === '.json') {
          const code = readFileSync(fullPath, 'utf8')
          files[fullPath] = code
        }
      })
    }
    scanDirectory(this.path)

    this.files = files
  }

  async compress (): Promise<void> {
    this.core.debug('Iniciando Compreção...\n\n')
    this.progressBar.start(Object.entries(this.files).length, 0)
    for (const [filePath, fileContent] of Object.entries(this.files)) {
      const newPath = path.dirname(filePath).replace(this.path, this.pathBuild)
      const fileName = path.basename(filePath)
      const fileExt = path.extname(filePath)

      if (!existsSync(newPath)) { mkdirSync(newPath, { recursive: true }) }

      if (fileExt === '.js') {
        const result = await minify({ [filePath]: fileContent }, {
          compress: true,
          parse: {
            bare_returns: true
          },
          ie8: false,
          keep_fnames: false,
          mangle: true,
          module: true,
          toplevel: true,
          output: {
            ascii_only: true,
            beautify: false,
            comments: false
          }
        })
        this.filesCompress.push({ [`${newPath}/${fileName}`]: result.code })
      }
      this.progressBar.increment()
    }
    this.progressBar.stop()
  }

  async obfuscate (): Promise<void> {
    this.core.debug('Iniciando Ofuscamento...\n\n')
    this.progressBar.start(Object.entries(this.files).length, 0)

    for (const fileData of this.filesCompress) {
      for (const [key, value] of Object.entries(fileData)) {
        if (value === undefined) throw new Error(`Ocorreu um erro ao tentar ofuscar o arquivo: ${key}`)
        const response = obfuscate(value, {
          optionsPreset: 'medium-obfuscation',
          // log: true,
          seed: this.seed,
          disableConsoleOutput: false
        })
        writeFileSync(key, response.getObfuscatedCode(), 'utf8')
        this.progressBar.increment()
      }
    }

    this.progressBar.stop()
  }

  async initialConfig (): Promise<void> {
    this.core.debug('Setando configurações inicias...\n\n')
    const json = JSON.stringify({ token: generate(256) }, null, 2)
    await writeFile(path.join(process.cwd(), 'build/settings/settings.json'), json)
  }

  async release (): Promise<void> {
    const args = ['.', '--compress', 'Brotli', '--no-bytecode', '--public-packages', '"*"', '--public']
    const builds: string[] = []
    const manifests: BuildManifest[] = []

    if (os.platform() !== 'win32') {
      for (const platform of this.platforms) {
        for (const arch of this.archs) {
          builds.push(`node${this.nodeVersion}-${platform}-${arch}`)
        }
      }
    } else {
      for (const arch of this.archs) {
        builds.push(`node${this.nodeVersion}-win-${arch}`)
      }
    }

    for (const build of builds) {
      const startTime = Date.now()
      const nameSplit = build.split('-')
      const buildName = `./release/paymentbot-${nameSplit[1]}-${nameSplit[2]}${nameSplit[1] === 'win' ? '.exe' : nameSplit[1] === 'macos' ? '.app' : ''}`
      const newArg: string[] = []

      if (existsSync(buildName)) rmSync(buildName)
      if (existsSync(`release/manifest-${nameSplit[1]}.json`)) rmSync(`release/manifest-${nameSplit[1]}.json`)

      newArg.push(...args, '-t', build, '-o', buildName)
      this.core.debug('Iniciando Build...\n\n')
      await exec(newArg)

      const timeSpent = (Date.now() - startTime) / 1000 + 's'
      this.core.info(`Build | ${nameSplit[1]}-${nameSplit[2]} | ${timeSpent}`)

      const file = await readFile(buildName)
      const hashMD5 = createHash('md5').update(file).digest('hex')
      const hashSHA = createHash('sha256').update(file).digest('hex')

      manifests.push({
        [nameSplit[1]]: {
          path: buildName.replace('./release/', ''),
          platform: nameSplit[1],
          arch: nameSplit[2],
          size: formatBytes(file.byteLength),
          timeBuild: timeSpent,
          hashMD5,
          hashSHA
        }
      })
    }

    for (const manifest of manifests) {
      for (const [key, value] of Object.entries(manifest)) {
        const values = [value]
        if (existsSync(`release/manifest-${key}.json`)) {
          const existContent = JSON.parse(await readFile(`release/manifest-${key}.json`, { encoding: 'utf-8' })) as BuildInfo[]
          values.push(...existContent)
          console.log(values)
        }
        writeFileSync(`release/manifest-${key}.json`, JSON.stringify(values, null, 4))
      }
    }
  }

  async remove (): Promise<void> {
    await rmdir(this.pathBuild)
  }
}

const args = process.argv.slice(2)
const build = new Build({
  path: 'dist',
  pathBuild: 'build',
  archs: ['x64', 'arm64'],
  platforms: ['linux'],
  nodeVersion: '18'
})

async function start (): Promise<void> {
  switch (args[0].replace('--', '')) {
    case 'pre-build':
      await build.loadFiles()
      await build.compress()
      await build.obfuscate()
      break
    case 'only-build':
      await build.initialConfig()
      await build.release()
      break
    default:
      await build.start()
  }
}

void start()
