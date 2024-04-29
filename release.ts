import { exec } from '@yao-pkg/pkg'
import { Presets, SingleBar } from 'cli-progress'
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import { copyFile, readFile } from 'fs/promises'
import { obfuscate } from 'javascript-obfuscator'
import { Loggings } from 'loggings'
import os from 'os'
import path from 'path'
import { minify } from 'terser'
import { formatBytes } from './src/functions/Format'
import { InternalAxiosRequestConfig } from 'axios'
import { generateKey, generateKeySync } from 'crypto'
import { generate } from 'randomstring'

async function carregarDados (options: {
  diretorio: string
}): Promise<Record<string, string>> {
  const { diretorio } = options
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
  scanDirectory(diretorio)

  return files
}

async function compress (): Promise<void> {
  const seed = Math.random()
  const core = new Loggings()
  const progressBar = new SingleBar({}, Presets.rect)
  const files = await carregarDados({ diretorio: 'dist' })
  progressBar.start(Object.entries(files).length, 0)
  for (const [filePath, fileContent] of Object.entries(files)) {
    progressBar.increment(1)
    const newPath = path.dirname(filePath).replace('dist', 'build')
    const fileName = path.basename(filePath)
    const fileExt = path.extname(filePath)
    if (!existsSync(newPath)) { mkdirSync(newPath, { recursive: true }) }

    if (fileExt === '.js') {
      await minify({ [filePath]: fileContent }, {
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
        .then((result) => {
          if (typeof result.code !== 'string') return
          const response = obfuscate(fileContent, {
            optionsPreset: 'medium-obfuscation',
            log: true,
            seed,
            disableConsoleOutput: false
          })
          writeFileSync(`${newPath}/${fileName}`, response.getObfuscatedCode(), 'utf8')
        })
        .catch((err) => {
          console.log(`Não foi possivel comprimir o arquivo: ${filePath}`)
          console.error(err)
        })
    } else {
      writeFileSync(`${newPath}/${fileName}`, fileContent, 'utf8')
    }
  }

  progressBar.stop()
  
  const json = JSON.stringify({ token: generate(256) }, null, 2)
  writeFileSync(path.join(process.cwd(), 'build/settings/settings.json'), json)

  const args = ['.', '--no-bytecode', '--compress', 'Brotli', '--public-packages', '"*"', '--public']
  const platforms = ['alpine', 'linux', 'linuxstatic']
  const archs = ['x64', 'arm64']

  const nodeVersion = '18'
  const allBuild: string[] = []
  const manifest: Array<{
    path: string
    platform: string
    arch: string
    size: string
    timeBuild: string
  }> = []

  if (os.platform() !== 'win32') {
    for (const platform of platforms) {
      for (const arch of archs) {
        allBuild.push(`node${nodeVersion}-${platform}-${arch}`)
      }
    }
  } else {
    for (const arch of archs) {
      allBuild.push(`node${nodeVersion}-win-${arch}`)
    }
  }

  console.log(os.platform())
  for (const build of allBuild) {
    const startTime = Date.now()
    const nameSplit = build.split('-')
    const buildName = build.split('-')
    buildName.splice(0, 1)
    const buildType = nameSplit[1] === 'win'
      ? `./release/paymentbot-${buildName.join('-')}.exe`
      : `./release/paymentbot-${buildName.join('-')}`

    const newArg: string[] = []
    newArg.push(...args)
    newArg.push('-t', build, '-o', buildType)
    await exec(newArg)

    const endTime = Date.now()
    const timeSpent = (endTime - startTime) / 1000 + 's'
    core.info(`Build | ${nameSplit[1]}-${nameSplit[2]} | ${timeSpent}`)

    const file = await readFile(buildType)
    manifest.push({
      path: buildType.replace('./release/', ''),
      platform: nameSplit[1],
      arch: nameSplit[2],
      size: formatBytes(file.byteLength),
      timeBuild: timeSpent
    })
  }

  writeFileSync('release/manifest.json', JSON.stringify(manifest, null, 4))
}

void compress()
