import { ChildProcess, spawn } from 'child_process'
import { cp } from 'fs/promises'
import { glob } from 'glob'
import { basename, join } from 'path'
import { BuildType, PluginBuilder, type BuildMetadata } from './build'
import chokidar from 'chokidar'

const outputDirectory = join(process.cwd(), 'releases')

const config: BuildMetadata = {
  path: 'plugins/*',
  type: BuildType.File,
  options: {
    entryFile: 'src/app.ts',
    outputDirectory,
  }
}

for (const path of await glob([config.path], { cwd: process.cwd() })) {
  config.path = path
  const builder = new PluginBuilder(config)
  await builder.build()
}

for (const plugin of await glob(`${outputDirectory}/*`)) {
  const pluginName = basename(plugin)

  cp(plugin, join(process.cwd(), `core/plugins/${pluginName}`))
}

const watcher = chokidar.watch([
  'server/**/*',
  'core/**/*',
  'plugins/**/*',
  'packages/**/*'
], {
  ignored: [
    'core/plugins',
    'devlop.ts',
    'plugins/tickets/src/register.ts',
    'plugins/tickets/entries.json',
    'core/entries',
    'core/locales',
    'server/database.wm'
  ]
})

const childProcesses: ChildProcess[] = []

function killAll() {
  console.log('Matando todos os processos filhos...')
  for (const child of childProcesses) {
    if (!child.killed) {
      child.kill()
    }
  }
}

function run(directory: string): ChildProcess
function run(directory: string, waitFor: string): Promise<void>
function run(directory: string, waitFor?: string): Promise<void> | ChildProcess {
  if (waitFor) {
    return new Promise<void>((resolve, reject) => {
      const proc = spawn('bun', ['run', 'dev'], {
        cwd: join(process.cwd(), directory),
        stdio: ['inherit', 'pipe', 'pipe']
      })

      childProcesses.push(proc)
      let settled = false

      function handleError(data: Buffer) {
        const output = data.toString()
        process.stdout.write(output)
        if (output.includes('EADDRINUSE') || output.includes('Failed to start server')) {
          if (!settled) {
            settled = true
            reject(new Error(`Erro no processo em ${directory}: ${output}`))
            killAll()
          }
        }
      }

      proc.stdout?.on('data', (data: Buffer) => {
        const output = data.toString()
        process.stdout.write(output)
        if (output.includes(waitFor) && !settled) {
          settled = true
          resolve()
        }
      })

      proc.stderr?.on('data', handleError)

      proc.on('error', (err) => {
        if (!settled) {
          settled = true
          reject(err)
          killAll()
        }
      })

      proc.on('exit', code => {
        console.log(`Processo em ${directory} finalizado com código ${code}`)
        if (code !== 0 && !settled) {
          settled = true
          reject(new Error(`Processo em ${directory} finalizou com código ${code}`))
          killAll()
        }
      })
    })
  } else {
    const proc = spawn('bun', ['run', 'dev'], {
      cwd: join(process.cwd(), directory),
      stdio: 'inherit'
    })
    childProcesses.push(proc)
    proc.on('exit', code => {
      console.log(`Processo em ${directory} finalizado com código ${code}`)
      if (code !== 0) {
        killAll()
      }
    })
    return proc
  }
}

watcher.on('all', (name) => console.log(name))
watcher.on('all', async () => {
  killAll()

  try {
    await run('server', 'Server listening')
    run('core')
  } catch (error) {
    console.error('Erro ao iniciar os processos:', error)
    killAll()
  }
})
