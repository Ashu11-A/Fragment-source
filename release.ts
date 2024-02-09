import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import os from 'os';
import path from 'path'
import { minify } from 'terser'
import { SingleBar, Presets } from 'cli-progress'
import { exec } from 'pkg'

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
        },
        sourceMap: true
      })
        .then((result) => {
          if (typeof result.code !== 'string') return
          writeFileSync(`${newPath}/${fileName}`, result.code, 'utf8')
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

  const args = ['.', '-d', '--compress', 'GZip', '--no-bytecode', '--public-packages', '"*"', '--public']

  switch (os.platform()){
    case 'linux':
      args.push("-t", 'node18-linux-x64,node18-linux-arm64')
      break
    case 'win32':
      args.push("-t", 'node18-win-x64,node18-win-arm64')
      break
  }

  console.log(os.platform())
  console.log(args)

  await exec(args)
}

void compress()