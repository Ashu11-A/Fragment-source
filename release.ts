import { formatBytes } from 'bytes-formatter'
import { exec, exec as processChild } from 'child_process'
import { Presets, SingleBar } from 'cli-progress'
import { createHash } from 'crypto'
import { build } from 'esbuild'
import { createWriteStream, existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { exists, move } from 'fs-extra'
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'fs/promises'
import { glob } from 'glob'
import obfuscate from 'javascript-obfuscator'
import os from 'os'
import path, { join } from 'path'
import { cwd } from 'process'
import { Readable } from 'stream'
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
}

interface Asset {
  url: string;
  id: number;
  node_id: string;
  name: string;
  label: string;
  uploader: {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
    site_admin: boolean;
  };
  content_type: string;
  state: string;
  size: number;
  download_count: number;
  created_at: string;
  updated_at: string;
  browser_download_url: string;
}


class Build {
  public readonly options: BuildConstructor

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

    if (sucess) { await move(`${this.options.source}/dist`, `./${this.options.outBuild}/src`, { overwrite: true }); return }
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
    if (existsSync(`${this.options.outBuild}/node_modules`)) execProcess(`cd ${this.options.outBuild} && rm -r node_modules`)
    await execProcess(`cd ${this.options.outBuild} && npm i && npm rebuild better_sqlite3 && npm rebuild`)
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
      format: 'cjs'
      // plugins: []
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
      const manifestName = `${nameSplit[1]}-${nameSplit[2]}` // linux-x64
      
      const buildName = `${packageJson?.name ?? `paymentbot-${Date.now()}`}-${nameSplit[1]}-${nameSplit[2]}${nameSplit[1] === 'win' ? '.exe' : nameSplit[1] === 'macos' ? '.app' : ''}`
      const newArg: string[] = []

      if (existsSync(buildName)) rmSync(buildName)
      if (existsSync(`${this.options.outRelease}/manifest-${nameSplit[1]}.json`)) rmSync(`release/manifest-${manifestName}.json`)

      console.debug(`\n\nIniciando Build ${nameSplit[2]}...`)
      newArg.push(...args, '-t', build, '--output', `${this.options.outRelease}/${buildName}`)

      await execProcess(`cd ${this.options.outBuild} && PKG_CACHE_PATH=${join(process.cwd(), 'pkg-cache')} PKG_IGNORE_TAG=true npx pkg ${newArg.join(" ")}`)

      const timeSpent = (Date.now() - this.startTime) / 1000 + 's'
      console.info(`Build | ${nameSplit[1]}-${nameSplit[2]} | ${timeSpent}`)

      const file = await readFile(`${this.options.outRelease}/${buildName}`)
      const hashMD5 = createHash('md5').update(file).digest('hex')
      const hashSHA = createHash('sha256').update(file).digest('hex')

      manifests.push({
        [manifestName]: {
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
const archs = ['arm64', 'x64'];

(async (): Promise<void> => {
  if (!versions.includes(version)) throw new Error(`Nodejs invalido!\nVersões validas: [${versions.join(', ')}]`)
  if (!archs.includes(arch)) throw new Error(`Arquitetura invalida!\nArquiteturas validas: ${archs.join(', ')}`)

  const argsList: Array<Arg> = [
    { command: 'help', alias: ['-h'], rank: 0 },
    { command: 'source', alias: ['-s'], rank: 1, hasString: true },
    { command: 'pre-build', alias: ['-p'], rank: 2 },
    { command: 'install', alias: ['-i'], rank: 3 },
    { command: 'clean', alias: [''], rank: 4 },
    { command: 'compress', alias: ['-c'], rank: 5 },
    { command: 'obfuscate', alias: ['-f'], rank: 6 },
    { command: 'esbuild', alias: ['-esb'], rank: 7 },
    { command: 'pkg', alias: [''], rank: 7 },
  ]

  for (const arg of args.filter((arg) => arg.includes('-'))) {
    const allArgs = argsList.flatMap(({ command, alias }) => [command, ...alias.map((alia) => alia || command)])
    if (!allArgs.includes(arg)) throw new Error(`Not found arg ${arg}, try --help`)
  }

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
      outBuild: `build/${project}`,
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
      outBuild: `build/${sourcePath}`,
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

  const exec: Array<() => Promise<void> | void> = []
  const execQueue = async (functions: typeof exec) => {
    if (functions.length === 0) return
    for (const currentFunction of functions) {
      await currentFunction()
    }
  }

  for (const build of builds) {
    if (newArgs.filter((arg) => arg.command === 'pkg').length > 0) {
      const pkgPath = join(cwd(), `pkg-cache`)
      const arch = `${build.options.platforms}-${build.options.archs}`
      const pkgFiles = await glob(`${pkgPath}/fetched**-${arch}`) // ['node-v20.11.1-linux-x64']

      if (pkgFiles.length === 0) {
        const { assets } = (await (await fetch('https://api.github.com/repos/yao-pkg/pkg-fetch/releases/latest')).json()) as { assets: Asset[] }
        const versions = assets.filter((asset) => asset.name.includes(arch) && !asset.name.includes('sha256sum'))
        const version = versions[versions.length - 1]
        const download = await fetch(version.browser_download_url)
        const downloadName = `fetched-${version.name.split('-').filter((content) => content !== 'node').join('-')}`

        console.log(`Downloading ${downloadName}`)

        await new Promise<void>(async (resolve, reject) => {
          if (download.ok && download.body) {
            if (!await exists(pkgPath)) await mkdir(pkgPath)
            const path = createWriteStream(`${pkgPath}/${downloadName}`)
            const wrile = Readable.fromWeb(download.body).pipe(path)
            wrile.on('finish', () => resolve())
            wrile.on('error', (err) => reject(err))
          } else {
            reject(download.statusText)
          }
        })
      }
    }

    if (newArgs.length === 0) {
      exec.push(() => build.default())
      continue
    }

    console.log(`Ordem das args: ${newArgs.map((arg) => arg.command).join(' --> ')}`)

    const buildFunctions: typeof exec = []

    for (let argNum = 0; argNum < newArgs.length; argNum++) {
      console.log(newArgs[argNum])
      switch (newArgs[argNum].command) {
      case 'pre-build': {
        buildFunctions.push(async () => { await build.build(); await build.config() })
        break
      }
      case 'install': {
        buildFunctions.push(() => build.install())
        break
      }
      case 'compress': {
        buildFunctions.push(async () => { await build.compress(); await build.compress({ directory: `${build.options.outBuild}/node_modules`, outBuild: `${build.options.outBuild}/node_modules` })} )
        break
      }
      case 'obfuscate': {
        buildFunctions.push(() => build.obfuscate())
        break
      }
      case 'clean': {
        buildFunctions.push(() => build.clear())
        break
      }
      case 'pkg': {
        buildFunctions.push(() => build.pkgbuild())
        break
      }
      case 'esbuild': {
        buildFunctions.push(() => build.esbuild())
        break
      }
      }
    }

    exec.push(async () => await execQueue(buildFunctions))
  }

  await Promise.all(exec.map((option) => option()))
})()

const execProcess = async (command: string) => await new Promise<void>((resolve, reject) => {
  const child = exec(command)
  child.stdout?.on('data', (output: string) => console.log(output))
  child.stderr?.on('data', (output: string) => console.log(output))
  child.on('close', (code, signal) => {
    if (code !== 0) {
      reject(signal)
    }
    resolve()
  })
})