import { execSync, exec as processChild } from 'child_process'
import { Presets, SingleBar } from 'cli-progress'
import { createHash } from 'crypto'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { move } from 'fs-extra'
import { readdir, readFile, rm, stat, writeFile } from 'fs/promises'
import { glob } from 'glob'
import obfuscate from 'javascript-obfuscator'
import os from 'os'
import path, { dirname, join } from 'path'
import { minify } from 'terser'
import { build } from 'esbuild'
import { compressor } from 'esbuild-plugin-compressor';

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
}

class Build {
  private readonly options: BuildConstructor

  private readonly progressBar = new SingleBar({}, Presets.rect)
  private readonly startTime = Date.now()

  constructor(options: BuildConstructor) {
    this.options = options
  }

  async default(): Promise<void> {
    await this.build()
    await this.config()
    await this.compress()
    await this.obfuscate()
    await this.install()
    await this.clear()
    await this.compress({ directory: `${this.options.outBuild}/node_modules`, outBuild: `${this.options.outBuild}/node_modules` })
    await this.pkgbuild()
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

  async sign(): Promise<void> {

  }

  async compress(options?: { directory: string, outBuild: string }): Promise<void> {
    const { directory, outBuild } = options ?? { directory: `${this.options.outBuild}/src`, outBuild: `${this.options.outBuild}/src` }
    const paths = await glob([`${directory}/**/*.js`])
    const pathsFormated = []

    for (const filePath of paths) {
      if (!(await stat(filePath)).isFile() || filePath.includes('bindings')) {
        console.log(`Removendo da compressão: ${filePath}`)
        continue
      }
      const { length } = await readFile(filePath)
      pathsFormated.push({ filePath, length })
    }

    const totalLength = pathsFormated.reduce((total, { length }) => total + length, 0)

    console.debug(`\n\nIniciando Compressão de ${totalLength} linhas...`)
    this.progressBar.start(totalLength, 0)
    for (const { filePath, length } of pathsFormated) {
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

      if (result.code === undefined) { this.progressBar.increment(length); continue }

      await writeFile(`${newPath}/${fileName}`, result.code, { encoding: 'utf-8' })
      this.progressBar.increment(length)
    }
    this.progressBar.stop()
  }

  async obfuscate(options?: { directory: string, outBuild: string }): Promise<void> {
    console.debug('\n\nIniciando Ofuscamento...')
    const seed = Math.random()
    const paths = await glob([options?.directory ?? `${this.options.outBuild}/src/**/*.js`])

    this.progressBar.start(paths.length, 0)

    for (const filePath of paths) {
      const fileName = path.basename(filePath)
      if (fileName.split('.').includes('entry')) {
        console.log(`Pulando ofuscamento do arquivo: ${filePath}`)
        continue
      }
      const fileContent = await readFile(filePath, { encoding: 'utf-8' })
      const response = obfuscate.obfuscate(fileContent, {
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

  async config(): Promise<void> {
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

  async install(): Promise<void> {
    console.debug('\n\nInstalando Modulos...')
    if (existsSync(`${this.options.outBuild}/node_modules`)) execSync(`cd ${this.options.outBuild} && rm -r node_modules`, { stdio: 'inherit' })
    execSync(`cd ${this.options.outBuild} && npm i && npm rebuild better_sqlite3 && npm rebuild`, { stdio: 'inherit' })
  }

  async clear(): Promise<void> {
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

  async esbuild(options?: { entryPoints: string[], outfile: string }) {
    const packagePath = path.join(process.cwd(), `${this.options.outBuild}/package.json`)
    const packageJson = JSON.parse(await readFile(packagePath, { encoding: 'utf-8' })) as Record<string, string | object | null>
    await build({
      entryPoints: options?.entryPoints ?? [`${this.options.outBuild}/src/app.js`],
      bundle: true,
      minify: true,
      logLevel: 'silent',
      outfile: options?.outfile ?? `${this.options.outBuild}/bundle.cjs`,
      platform: 'node',
      format: 'cjs',
      plugins: [
        compressor({
          compressType: 'brotli',
          fileTypes: ['js']
        })
      ]
    })
    await rm(path.join(process.cwd(), `${this.options.outBuild}/node_modules`), { recursive: true })
    await rm(path.join(process.cwd(), `${this.options.outBuild}/src`), { recursive: true })
    await writeFile(
      packagePath,
      JSON.stringify({
        ...packageJson,
        bin: 'bundle.cjs',
        main: 'bundle.cjs'
      }, null, 2), {
        encoding: 'utf-8'
      })
  }

  async pkgbuild(): Promise<void> {
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

interface Arg {
  command: string
  alias: string[]
  rank: number
  hasString?: boolean
  string?: string
}

const args = process.argv.slice(2).map((arg) => arg.replace('--', ''))
const version = process.version.split('.')[0].replace('v', '')
const versions = ['18', '20']
const arch = process.arch
const archs = ['arm64', 'x64']

async function start(): Promise<void> {
  if (!versions.includes(version)) throw new Error(`Nodejs invalido!\nVersões validas: [${versions.join(', ')}]`)
  if (!archs.includes(arch)) throw new Error(`Arquitetura invalida!\nArquiteturas validas: ${archs.join(', ')}`)

  const argsList: Array<Arg> = [
    { command: 'help', alias: ['-h'], rank: 0 },
    { command: 'source', alias: ['-s'], rank: 1, hasString: true },
    { command: 'pre-build', alias: ['-p'], rank: 2 },
    { command: 'install', alias: ['-i'], rank: 3 },
    { command: 'compress', alias: ['-c'], rank: 4 },
    { command: 'obfuscate', alias: ['-f'], rank: 5 },
    { command: 'esbuild', alias: ['-esb'], rank: 6 },
    { command: 'pkg', alias: [''], rank: 6 },
  ]

  let newArgs: Array<Arg> = []

  // Replace string for Arg
  for (let argIndex = 0; argIndex < args.length; argIndex++) {
    for (const arg of argsList) {
      if (arg.alias.includes(args[argIndex]) || args[argIndex] === arg.command) {
        if (arg?.hasString) {
          // caso a proxima arg seja não seja uma strings, e sim uma arg
          if (args[argIndex + 1]?.startsWith('-')) {
            newArgs.push(arg)
            continue
          }
          ++argIndex
          newArgs.push({ ...arg, string: args[argIndex] })
          continue
        }
        newArgs.push(arg)
        continue
      }
    }
  }

  // Mapea os diretorios que serão buildados
  const directories = (await readdir('plugins')).map((dir) => `plugins/${dir}`); directories.push('core')
  const builds: Array<Build> = []

  // Gera todas as class de build
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

  const sourceIndex = newArgs.findIndex((arg) => arg.command === 'source')

  // Build only --source path
  if (sourceIndex !== -1) {
    const sourcePath = newArgs[sourceIndex]?.string
    if (sourcePath === undefined) throw new Error('Path não especificado para --source!')

    // Remove elements in Array
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
    // Remove arg --source with your path
    newArgs.splice(sourceIndex, 1)
  }

  function quickSort(array: Array<Arg>): Array<Arg> {
    if (array.length <= 1) {
      return array
    }
    // Seleciona um elemento como pivô (o elemento pivo será usado como comparação)
    const pivô = array[0]
    const menor = []
    const maior = []

    for (let int = 1; int < array.length; int++) {
      // Se o elemento atual for menor que o pivô
      if (array[int].rank < pivô.rank) {
        menor.push(array[int])
        continue
      }
      // se for maior
      maior.push(array[int])
    }
    // Concatena recursivamente as arrays ordenadas menor + pivô + maior
    return quickSort(menor).concat(pivô, quickSort(maior))
  }

  newArgs = quickSort(newArgs)

  
  if (newArgs.find((arg) => arg.command === 'help')) {
    console.log(`
release [options] <input>

    Options:
  
      -h,  --help         Output usage information
      -s,  --source       Build a specific directory
      -p,  --pre-build    Only build what the pkg needs
           --pkg           Only build with pkg
      -esb --esbuild      Build with esbuild
      -i   --install      Install packages
      -c   --compress     Compress with terser
      -f   --obfuscate    Obfuscate Code
          `)
    return
  }

  for (const build of builds) {
    if (newArgs.length === 0) {
      await build.default()
      continue
    }

    console.log(`Ordem das args: ${newArgs.map((arg) => arg.command).join(' --> ')}`)
    
    for (let argNum = 0; argNum < newArgs.length; argNum++) {
      console.log(newArgs[argNum])
      switch (newArgs[argNum].command) {
      case 'pre-build': {
        await build.build()
        await build.config()
        break
      }
      case 'install': {
        await build.install()
        break
      }
      case 'compress': {
        await build.compress()
        break
      }
      case 'obfuscate': {
        await build.obfuscate()
        break
      }
      case 'pkg': {
        await build.pkgbuild()
        break
      }
      case 'esbuild': {
        await build.esbuild()
        break
      }
      }
    }

  }
}

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

void start()
