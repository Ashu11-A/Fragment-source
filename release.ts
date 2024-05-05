import { exec } from '@yao-pkg/pkg'
import { type ExecException, exec as processChild } from 'child_process'
import { Presets, SingleBar } from 'cli-progress'
import { createHash } from 'crypto'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { readFile, rm, stat, writeFile } from 'fs/promises'
import { glob } from 'glob'
import { obfuscate } from 'javascript-obfuscator'
import os from 'os'
import path from 'path'
import { generate } from 'randomstring'
import { minify } from 'terser'

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

interface BuildConstructor {
  /**
   * Directory of Typescript Resources
   */
  directory: string
  /**
   * Outdir of build
   */
  outdir: string
  /**
   * Plataforms of builds
   */
  platforms: Array<'linux' | 'alpine' | 'linuxstatic' | 'macos'>
  /**
   * Archs of build
   */
  archs: Array<'x64' | 'arm64'>
  /**
   * Node version of build
   */
  nodeVersion: '18' | '20'
  /**
   * Compress build? (default:true)
   */
  compress?: boolean
  /**
   * Config build? (default:true)
   */
  config?: boolean
  /**
   * Obfuscate build? (default:true)
   */
  obfuscate?: boolean
  /**
   * Make application build? (default:true)
   */
  pkgbuild?: boolean
}

class Build {
  private readonly options: BuildConstructor

  private readonly progressBar = new SingleBar({}, Presets.rect)
  private readonly startTime = Date.now()

  constructor (options: BuildConstructor) {
    this.options = options
  }

  async start (): Promise<void> {
    if (this.options.compress !== false) await this.compress()
    if (this.options.obfuscate !== false) await this.obfuscate()
    if (this.options.config !== false) await this.config()
    if (this.options.pkgbuild !== false) await this.pkgbuild()
  }

  formatBytes (bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
  }

  async compress (options?: { directory: string, outdir: string }): Promise<void> {
    const { directory, outdir } = options ?? { directory: this.options.directory, outdir: `${this.options.outdir}/src` }
    const paths = await glob([`${directory}/**/*.js`])

    console.log(directory, outdir)

    console.debug('\n\nIniciando Compressão...')
    this.progressBar.start(paths.length, 0)
    for (const filePath of paths) {
      if (!(await stat(filePath)).isFile() || filePath.includes('bindings')) {
        console.log(filePath)
        this.progressBar.increment()
        continue
      }

      const newPath = path.dirname(filePath).replace(directory, outdir)
      const fileContent = await readFile(filePath)
      const fileName = path.basename(filePath)

      if (!existsSync(newPath)) mkdirSync(newPath, { recursive: true })

      const result = await minify({ [filePath]: fileContent.toString('utf-8') }, {
        compress: true,
        module: true,
        toplevel: true,
        parse: {
          bare_returns: true
        },
        format: {
          braces: true,
          comments: 'some',
          keep_quoted_props: true,
          wrap_iife: true
        },
        nameCache: {},
        keep_classnames: true,
        keep_fnames: true
      })

      if (result.code === undefined) {
        this.progressBar.increment()
        continue
      }

      await writeFile(`${newPath}/${fileName}`, result.code, { encoding: 'utf-8' })
      this.progressBar.increment()
    }
    this.progressBar.stop()
  }

  async obfuscate (): Promise<void> {
    console.debug('\n\nIniciando Ofuscamento...')
    const seed = Math.random()
    let paths: string[]

    if (this.options.compress === false) {
      paths = await glob([`${this.options.directory}/src/**/*.js`])
    } else {
      paths = await glob([`${this.options.outdir}/src/**/*.js`])
    }

    this.progressBar.start(paths.length, 0)

    for (const filePath of paths) {
      const fileContent = await readFile(filePath, { encoding: 'utf-8' })
      const response = obfuscate(fileContent, {
        optionsPreset: 'medium-obfuscation',
        // log: true,
        seed,
        disableConsoleOutput: false
      })

      writeFileSync(filePath, response.getObfuscatedCode(), 'utf8')
      this.progressBar.increment()
    }
    this.progressBar.stop()
  }

  async config (): Promise<void> {
    console.debug('\n\nConfigurações inicias...')
    const json = JSON.stringify({ token: generate(256) }, null, 2)
    await writeFile(path.join(process.cwd(), 'build/src/settings/settings.json'), json)

    console.debug('Configurando package.json')
    const packageJson = JSON.parse(await readFile(path.join(process.cwd(), 'package.json'), { encoding: 'utf-8' })) as Record<string, string | object | null>
    packageJson.main = 'src/app.js'
    packageJson.bin = 'src/app.js'
    const remove = ['devDependencies', 'scripts', 'keywords', 'pkg']

    for (const name of remove) {
      delete packageJson?.[name]
    }

    await writeFile(path.join(process.cwd(), `${this.options.outdir}/package.json`), JSON.stringify(packageJson, null, 2))
  }

  async install (): Promise<void> {
    console.debug('\n\nInstalando Modulos...')
    if (existsSync(`${this.options.outdir}/node_modules`)) {
      await new Promise<ExecException | null>((resolve, reject) => {
        processChild(`cd ${this.options.outdir} && rm -r node_modules`, (error, _stdout, stderr) => {
          if (error !== null || stderr !== '') {
            reject(error ?? stderr)
          }
          resolve(null)
        })
      })
    }
    await new Promise<ExecException | null>((resolve, reject) => {
      processChild(`cd ${this.options.outdir} && npm i && npm rebuild better_sqlite3 && npm rebuild`, (error, _stdout, stderr) => {
        if (error !== null || stderr !== '') {
          reject(error ?? stderr)
        }
        resolve(null)
      })
    })
  }

  async clear (): Promise<void> {
    const removeModules = await glob([`${this.options.outdir}/node_modules/**/*`], {
      ignore: ['/**/*.js', '/**/*.json', '/**/*.cjs', '/**/*.node', '/**/*.yml']
    })

    console.debug('\n\nLimpando Modulos...')
    this.progressBar.start(removeModules.length, 0)

    for (const file of removeModules) {
      if ((await stat(file)).isFile()) await rm(file)
      this.progressBar.increment()
    }

    this.progressBar.stop()
  }

  async pkgbuild (): Promise<void> {
    const args = ['.', '--compress', 'Brotli', '--no-bytecode', '--public-packages', '"*"', '--public']
    const builds: string[] = []
    const manifests: BuildManifest[] = []

    if (os.platform() !== 'win32') {
      for (const platform of this.options.platforms) {
        for (const arch of this.options.archs) {
          builds.push(`node${this.options.nodeVersion}-${platform}-${arch}`)
        }
      }
    } else {
      for (const arch of this.options.archs) {
        builds.push(`node${this.options.nodeVersion}-win-${arch}`)
      }
    }

    for (const build of builds) {
      const nameSplit = build.split('-')
      const buildName = `./release/paymentbot-${nameSplit[1]}-${nameSplit[2]}${nameSplit[1] === 'win' ? '.exe' : nameSplit[1] === 'macos' ? '.app' : ''}`
      const newArg: string[] = []

      if (existsSync(buildName)) rmSync(buildName)
      if (existsSync(`release/manifest-${nameSplit[1]}.json`)) rmSync(`release/manifest-${nameSplit[1]}.json`)

      await this.install()
      await this.clear()
      await this.compress({ directory: `${this.options.outdir}/node_modules`, outdir: `${this.options.outdir}/node_modules` })

      console.debug(`\n\nIniciando Build ${nameSplit[2]}...`)
      newArg.push(...args, '-t', build, '-o', buildName)
      await exec(newArg)

      const timeSpent = (Date.now() - this.startTime) / 1000 + 's'
      console.info(`Build | ${nameSplit[1]}-${nameSplit[2]} | ${timeSpent}`)

      const file = await readFile(buildName)
      const hashMD5 = createHash('md5').update(file).digest('hex')
      const hashSHA = createHash('sha256').update(file).digest('hex')

      manifests.push({
        [nameSplit[1]]: {
          path: buildName.replace('./release/', ''),
          platform: nameSplit[1],
          arch: nameSplit[2],
          size: this.formatBytes(file.byteLength),
          timeBuild: timeSpent,
          hashMD5,
          hashSHA
        }
      })
    }

    console.log(...manifests)

    for (const manifest of manifests) {
      for (const [key, value] of Object.entries(manifest)) {
        const values = [value]
        if (existsSync(`release/manifest-${key}.json`)) {
          const existContent = JSON.parse(await readFile(`release/manifest-${key}.json`, { encoding: 'utf-8' })) as BuildInfo[]
          values.push(...existContent)
        }
        await writeFile(`release/manifest-${key}.json`, JSON.stringify(values, null, 4))
      }
    }
  }
}

const args = process.argv.slice(2)
const version = process.version.split('.')[0].replace('v', '')
const arch = process.arch

if (!(version === '18' || version === '20')) {
  throw new Error(`Versão do nodejs invalida!\nVersão atual: ${version}, Versões suportadas: [18, 20]`)
}

if (!(arch === 'arm64' || arch === 'x64')) {
  throw new Error('Arquitetura invalida!')
}

const build = new Build({
  directory: 'dist',
  outdir: 'build',
  archs: [arch],
  platforms: ['linux'],
  nodeVersion: version
})

async function start (): Promise<void> {
  switch (args[0]?.replace('--', '')) {
    case 'pre-build':
      await build.compress()
      await build.obfuscate()
      await build.config()
      break
    case 'only-build':
      await build.pkgbuild()
      break
    default:
      await build.start()
  }
}

void start()
