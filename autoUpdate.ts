import { watch } from 'chokidar'
import { readFile, writeFile } from 'fs/promises'
import { glob } from 'glob'
import { basename, dirname } from 'path'
import prompts, { Choice } from 'prompts'
import gradient from 'gradient-string'
import figlet from 'figlet'
import { statSync } from 'fs'
prompts.override((await import('yargs')).argv)
console.clear()
console.log(gradient('#8752a3', '#6274e7')(figlet.textSync('Synch System', 'Elite')))
console.log()

const number = gradient('#30c5d2', '#471069')
const ready = (ms: number,) => {
  let textGradient: gradient.Gradient = gradient('#30c67c', '#82f4b1')

  if (ms > 10 && ms <= 25) {
    textGradient = gradient('#ff930f', '#fff95b')
  } else if (ms > 26) {
    textGradient = gradient('#f89b29', '#e60b09')
  }
  console.log(textGradient(`✅ Ready in ${ms}ms\n`))
}
const tilte = gradient('#1f7ea1', '#b57bee')
const change = (text: string) => console.log(gradient('#f8a902', '#f3696e')(`✨ Change Detected: ${text}`))
const updating = (text: string) => console.log(gradient('#00ff87', '#60efff')(`🚀 Updating: ${text}`))

interface GetFiles {
    extension?: string
    ignorePath?: string
}

const getFiles = async ({ extension = '', ignorePath = 'null' }: GetFiles) => await glob(
  [
    `plugins/**/base/**/${extension}`,
    `plugins/**/controller/**/${extension}`,
    `plugins/**/src/${extension}`
  ], {
    cwd: process.cwd(),
    ignore: ['**/node_modules/**', `**/${ignorePath}/**`]
  }
)

const separator = async (paths: string[]): Promise<Map<string, string[]>> => {
  const separador = new Map<string, string[]>()

  for (const path of paths) {
    const dirHome = path.split('/')[1]
    separador.set(dirHome, [ ...(separador.get(dirHome) ?? []), path ]) 
  }

  return separador
}

const checkFiles = async (files: Map<string, string[]>) => {
  const sizes = []

  for (const [, values] of files) {
    for (const value of values) {
      sizes.push({ fileName: value, size: (await readFile(value)).length })
    }
  }

  const hasRun: string[] = []

  for (const { fileName, size: baseSize } of sizes) {
    const split = fileName.split('/')
    const path = split.splice(0, 2)
    const formatted = split.join('/')
    const file = basename(fileName)
    const findFiles = sizes.filter(({ fileName }) => fileName.includes(formatted) && !fileName.includes(path.join('/')))
    const differentBytes = findFiles.filter(({ size }) => size !== baseSize).map(({ fileName, size }) => ({ fileName, size }))
    
    // Caso o arquivo já tenha sido processado, ignore ele
    if (hasRun.includes(file)) continue
    hasRun.push(file)
    
    if (differentBytes.length > 0) {
      const choices: Choice[] = []
      
      differentBytes.push({ fileName, size: baseSize })
      choices.push(...differentBytes.map((file) => ({ title: file.fileName, description: `${file.size} Bytes`, value: file.fileName })))

      const select= await prompts({
        type: 'select',
        name: 'value',
        message: tilte('Arquivos com conteúdos diferentes!'),
        choices,
        initial: 1
      });

      const buffer = await readFile(select.value, { encoding: 'utf-8' })
      const start = Date.now()
      
      await Promise.all(differentBytes.map(({ fileName }) => {
        fileName !== select.value && updating(fileName); writeFile(fileName, buffer, { encoding: 'utf-8' })
      }))

      const end = Date.now()
      ready(end - start)
    }
  }
}

const watchPaths = await glob(['plugins/**/base/**/', 'plugins/**/controller/**/', 'plugins/**/src/*.ts'], { cwd: process.cwd(), ignore: ['**/node_modules/**'] })

console.log(`📦 Watching ${number(String(watchPaths.filter((path) => statSync(path).isDirectory()).length))} directories and ${number(String(watchPaths.filter((path) => !statSync(path).isDirectory()).length))} files\n`)

await checkFiles(await separator(await getFiles({ extension: '*.ts' })))

let running: string[] = []

for (const path of watchPaths) {
  const watcher = watch(path)
  watcher.on('change', async (path) => {
    if (path.endsWith('.ts') && !running.includes(path) /* Caso eles estejam sendo processados, os ignore */) {
      change(path)
      const start = Date.now()
      
      const pathName = path.split('/') // [ 'plugins', 'plugin_base', 'src', 'discord', 'base', 'index.ts' ]
      pathName.splice(0, 2) //            [ 'src', 'discord', 'base', 'index.ts' ]
      const fileName = basename(path) //  index.ts
      const dir = dirname(path) //        plugins/plugin_base/src/discord/base
      const files = await getFiles({ extension: fileName, ignorePath: dir })
      const filesToChange = files.filter((file) => {
        const filePath = file.split('/') // [ 'plugins', 'utils', 'src', 'index.ts' ]
        filePath.splice(0, 2) //            [ 'src', 'index.ts' ]
        if (filePath.join('/') === pathName.join('/')) return true
        return false
      })

      running.push(...filesToChange) // Setar arquivos como sendo executados

      const fileBuffer = await readFile(path, { encoding: 'utf-8' })
      const filesWriles = filesToChange.map((file) => {
        updating(file)
        writeFile(file, fileBuffer, { encoding: 'utf-8' })
      })

      await Promise.all(filesWriles) // Executa todas as Promises criadas em filesWriles

      const end = Date.now()
      ready(end - start)

      // Callback de 2 segundos para evitar entrar em loop infinito
      void new Promise<void>((resolve) => {
        setTimeout(() => {
          running = running.filter((run) => !running.includes(run))
          resolve()
        }, 2000)
      })
    }
  })
}