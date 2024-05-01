import { existsSync, lstatSync, mkdirSync, readdirSync, writeFileSync } from 'fs'
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
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('@vercel/ncc')('./', {
    // provide a custom cache path or disable caching
    cache: true,
    // externals to leave as requires of the build
    externals: files,
    // directory outside of which never to emit assets
    filterAssetBase: process.cwd(), // default
    minify: false, // default
    assetBuilds: true, // default
    watch: false, // default
    target: 'es2015', // default
    quiet: false, // default
    debugLog: false // default
  }).then(({ code, map, assets }: { code: string, map: any, assets: Record<string, Record<'source', Buffer>> }) => {
    for (const [pathCode, asset] of Object.entries(assets)) {
      if (existsSync(pathCode)) continue
      const locale = path.dirname(pathCode)
      const bufferString = asset.source.toString('hex')
      mkdirSync(locale, { recursive: true })
      writeFileSync(pathCode, bufferString)
    }

    writeFileSync('index.js', code)
  })
}

void start()
