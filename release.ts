import { execSync, exec as processChild } from 'child_process'
import { Presets, SingleBar } from 'cli-progress'
import { createHash } from 'crypto'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { move } from 'fs-extra'
import { readdir, readFile, rm, stat, writeFile } from 'fs/promises'
import { glob } from 'glob'
import { obfuscate } from 'javascript-obfuscator'
import os from 'os'
import path, { join } from 'path'
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
  source: string
  /**
   * outBuild of build
   */
  outBuild: string
  /**
   * outRelease of build
   */
  outRelease: string
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
    await this.build()
    if (this.options.compress !== false) await this.compress()
    if (this.options.obfuscate !== false) await this.obfuscate()
    if (this.options.config !== false) await this.config()
    if (this.options.pkgbuild !== false) await this.pkgbuild()
  }

  async build() {
    if (existsSync(this.options.outBuild)) rm(this.options.outBuild, { recursive: true }) // Remover o diretorio caso ele exista

    const sucess = await new Promise<boolean>((resolve, reject) => {
      processChild(`cd ${this.options.source} && npm i && npm run build`, (err, stdout, stderr) => { // Buildar typescript
        if (err !== null || stderr !== '') {
          console.log(stderr !== "" ? stderr : err)
          reject(false)
        }
        resolve(true)
      })
    })

    if (sucess) { await move(`${this.options.source}/dist`, './build/src', { overwrite: true }); return }
    throw new Error(`Ocorreu um erro ao tentar buildar o projeto ${this.options.source}`)
  }

  async sign (): Promise<void> {
    
  }

  async compress (options?: { directory: string, outBuild: string }): Promise<void> {
    const { directory, outBuild } = options ?? { directory: `${this.options.outBuild}/src`, outBuild: `${this.options.outBuild}/src` }
    const paths = await glob([`${directory}/**/*.js`])

    console.debug('\n\nIniciando Compressão...')
    this.progressBar.start(paths.length, 0)
    for (const filePath of paths) {
      if (!(await stat(filePath)).isFile() || filePath.includes('bindings')) {
        console.log(`Pulando compressão: ${filePath}`)
        this.progressBar.increment()
        continue
      }

      const newPath = path.dirname(filePath).replace(directory, outBuild)
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

      if (result.code === undefined) { this.progressBar.increment(); continue }

      await writeFile(`${newPath}/${fileName}`, result.code, { encoding: 'utf-8' })
      this.progressBar.increment()
    }
    this.progressBar.stop()
  }

  async obfuscate (): Promise<void> {
    console.debug('\n\nIniciando Ofuscamento...')
    const seed = Math.random()
    const paths = await glob([`${this.options.outBuild}/src/**/*.js`])

    this.progressBar.start(paths.length, 0)

    for (const filePath of paths) {
      const fileName = path.basename(filePath) 
      if (fileName.split('.').includes('entry')) {
        console.log(`Pulando ofuscamento do arquivo: ${filePath}`)
        continue
      }
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
    console.debug('Configurando package.json')
    const packageJson = JSON.parse(await readFile(path.join(process.cwd(), `${this.options.source}/package.json`), { encoding: 'utf-8' })) as Record<string, string | object | null>
    packageJson.main = 'src/app.js'
    packageJson.bin = 'src/app.js'
    packageJson.pkg = {
      scripts: [
        "src/**/*.js",
        "src/**/*.json",
        "package.json"
      ],
      assets: [
        "node_modules/**/*.js",
        "node_modules/**/*.cjs",
        "node_modules/**/*.json",
        "node_modules/**/*.node"
      ]
    }
  
    const remove = ['devDependencies', 'scripts', 'keywords', 'repository', 'bugs', 'homepage']

    for (const name of remove) delete packageJson?.[name]

    await writeFile(path.join(process.cwd(), `${this.options.outBuild}/package.json`), JSON.stringify(packageJson, null, 2))
  }

  async install (): Promise<void> {
    console.debug('\n\nInstalando Modulos...')
    if (existsSync(`${this.options.outBuild}/node_modules`)) execSync(`cd ${this.options.outBuild} && rm -r node_modules`, { stdio: 'inherit' })
    execSync(`cd ${this.options.outBuild} && npm i && npm rebuild better_sqlite3 && npm rebuild`, { stdio: 'inherit' })
  }

  async clear (): Promise<void> {
    const removeModules = await glob([`${this.options.outBuild}/node_modules/**/*`], {
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
      const packageJson = JSON.parse(await readFile(path.join(process.cwd(), `${this.options.outBuild}/package.json`), { encoding: 'utf-8' })) as Record<string, string | object | null>
      const nameSplit = build.split('-')
      const buildName = `${packageJson?.name ?? `paymentbot-${Date.now()}`}-${nameSplit[1]}-${nameSplit[2]}${nameSplit[1] === 'win' ? '.exe' : nameSplit[1] === 'macos' ? '.app' : ''}`
      const newArg: string[] = []

      if (existsSync(buildName)) rmSync(buildName)
      if (existsSync(`${this.options.outRelease}/manifest-${nameSplit[1]}.json`)) rmSync(`release/manifest-${nameSplit[1]}.json`)

      await this.install()
      await this.clear()
      await this.compress({ directory: `${this.options.outBuild}/node_modules`, outBuild: `${this.options.outBuild}/node_modules` })

      console.debug(`\n\nIniciando Build ${nameSplit[2]}...`)
      newArg.push(...args, '-t', build, '--output', `${this.options.outRelease}/${buildName}`)

      execSync(`cd ${this.options.outBuild} && PKG_CACHE_PATH=${join(process.cwd(), 'pkg-cache')} PKG_IGNORE_TAG=true npx pkg ${newArg.join(" ")}`, { stdio: 'inherit' })

      const timeSpent = (Date.now() - this.startTime) / 1000 + 's'
      console.info(`Build | ${nameSplit[1]}-${nameSplit[2]} | ${timeSpent}`)

      const file = await readFile(`${this.options.outRelease}/${buildName}`)
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

interface Args {
  command: string,
  alias: string[]
}

const args = process.argv.slice(2).map((arg) => arg.replace('-', ''))
const version = process.version.split('.')[0].replace('v', '')
const arch = process.arch

async function start (): Promise<void> {
  if (!['18', '20'].includes(version)) {
    throw new Error(`Versão do nodejs invalida!\nVersão atual: ${version}, Versões suportadas: [18, 20]`)
  }
  
  if (!['arm64', 'x64'].includes(arch)) {
    throw new Error('Arquitetura invalida!')
  }
  
  const argsList: Array<Args> = [
    { command: 'help', alias: ['h'] },
    { command: 'pre-build', alias: ['pb'] },
    { command: 'only-build', alias: ['ob'] },
    { command: 'source', alias: ['s'] }
  ]

  // Replace alias for command
  for (let argIndex = 0; argIndex < args.length; argIndex++) {
    for (const { command, alias } of argsList) {
      if (alias.includes(args[argIndex])) args[argIndex] = command
    }
  }

  const directories = (await readdir('plugins')).map((dir) => `plugins/${dir}`); directories.push('core')
  const builds: Array<Build> = []
  
  // Get all builds
  for (const project of directories) {
    builds.push(new Build({
      source: project,
      outBuild: 'build',
      outRelease: join(process.cwd(), 'release'),
      archs: [arch as ('arm64' | 'x64')],
      platforms: ['linux'],
      nodeVersion: version as ('18' | '20')
    }))
  }

  const sourceIndex = args.findIndex((arg) => arg === 'source')
  const sourcePath = args[(sourceIndex) + 1]
  
  // Build only --source path
  if (sourcePath !== undefined) {
    // Remove elements in Array
    args.splice(sourceIndex, 2)
    builds.splice(0, builds.length)

    builds.push(new Build({
      source: sourcePath,
      outBuild: 'build',
      outRelease: join(process.cwd(), 'release'),
      archs: [arch as ('arm64' | 'x64')],
      platforms: ['linux'],
      nodeVersion: version as ('18' | '20')
    }))
    console.log(`Buildando apenas o ${sourcePath}`)
  }

  if (args.find((arg) => arg === 'help')) {
    console.log(`
release [options] <input>

    Options:
  
      -h,  --help          Output usage information
      -pb, --pre-build     Only build what the pkg needs
      -ob, --only-build    Only build the plugins with pkg
      -s,  --source        Build a specific directory
          `)
    return
  }

  for (const build of builds) {
    if (args.length === 0) {
      await build.start()
      continue
    }

    for (let argNum = 0; argNum < args.length; argNum++) {
      switch (args[argNum]) {
        case 'pre-build': {
          await build.build()
          await build.compress()
          await build.obfuscate()
          await build.config()
        }
        case 'only-build': {
          await build.pkgbuild()
        }
        default: {
          argNum++
          await build.start()
        }
      }
    }

  }
}

function formatBytes (bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

void start()
