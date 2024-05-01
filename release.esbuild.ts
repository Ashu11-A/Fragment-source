import esbuild from 'esbuild'
import { nodeExternalsPlugin } from 'esbuild-node-externals'
import { lstatSync, readdirSync, writeFileSync } from 'fs'
import path from 'path'

async function loadFiles (): Promise<string[]> {
  const files: string[] = []

  function scanDirectory (diretorio: string): void {
    readdirSync(diretorio).forEach((file) => {
      const fullPath = path.join(diretorio, file)

      if (lstatSync(fullPath).isDirectory()) {
        scanDirectory(fullPath)
      } else if (path.extname(fullPath) === '.js' || path.extname(fullPath) === '.json') {
        files.push(fullPath)
      }
    })
  }
  scanDirectory('dist')
  return files
}

async function start (): Promise<void> {
  const files = await loadFiles()

  const tmpFile = 'release/tmp.js'
  writeFileSync(tmpFile, files.map(entry => `import "${path.resolve(entry)}"`).join(';\n'))

  esbuild.build({
    entryPoints: [tmpFile],
    external: files,
    bundle: true,
    minify: true,
    platform: 'node',
    plugins: [nodeExternalsPlugin()],
    outfile: 'release/bundle.js'
  })
    .then(() => { console.log('⚡ Javascript build complete! ⚡') })
    .catch(() => process.exit(1))
}

void start()
