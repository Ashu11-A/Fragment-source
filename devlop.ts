import { type ChildProcess, spawn } from 'child_process'
import { cp, mkdir, rm } from 'fs/promises'
import { glob } from 'glob'
import { join } from 'path'
import { BuildType, PluginBuilder, type BuildMetadata } from './build'
import chokidar from 'chokidar'
import chalk from 'chalk'

const ROOT = process.cwd()
const RELEASES_DIR = join(ROOT, 'releases')
const CORE_PLUGINS_DIR = join(ROOT, 'core/plugins')
const PLUGIN_GLOB = 'plugins/*'
const PLUGIN_DEBOUNCE_MS = 400

// Alinha o singleton do Constatic com o processo do core.
const PLUGIN_BUILD_BASE: Omit<BuildMetadata, 'path'> = {
  type: BuildType.File,
  options: {
    entryFile: 'src/app.ts',
    outputDirectory: RELEASES_DIR,
    buildArgs: ['--external=@ashu11a/constatic'],
  },
}

// ─── Service registry ────────────────────────────────────────────────────────

type ServiceName = 'server' | 'core' | 'dashboard'
type ServiceStatus = 'idle' | 'running' | 'stopped' | 'error'

type ServiceDef = {
  label: string
  badge: string
  cwd: string
  cmd: string
  args: string[]
}

const SERVICES: Record<ServiceName, ServiceDef> = {
  server: {
    label: 'SERVER',
    badge: chalk.blue.bold('[SERVER]'),
    cwd: join(ROOT, 'server'),
    cmd: 'bun',
    args: ['--watch', '--inspect=ws://localhost:6499', 'src/app.ts'],
  },
  core: {
    label: 'CORE',
    badge: chalk.green.bold('[CORE  ]'),
    cwd: join(ROOT, 'core'),
    cmd: 'bun',
    args: ['--watch', 'src/app.ts'],
  },
  dashboard: {
    label: 'DASHBOARD',
    badge: chalk.cyan.bold('[DASH  ]'),
    cwd: join(ROOT, 'dashboard'),
    cmd: 'bun',
    args: ['run', 'dev'],
  },
}

const SERVICE_KEYS: Record<ServiceName, string> = { server: '1', core: '2', dashboard: '3' }

const processes: Record<ServiceName, ChildProcess | null> = { server: null, core: null, dashboard: null }
const statuses: Record<ServiceName, ServiceStatus> = { server: 'idle', core: 'idle', dashboard: 'idle' }

// ─── Output ──────────────────────────────────────────────────────────────────

function write(badge: string, data: Buffer): void {
  const text = data.toString().replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  for (const line of text.split('\n')) {
    if (line.trim()) process.stdout.write(`${badge} ${line}\n`)
  }
}

function sys(message: string): void {
  console.log(chalk.magenta.bold('[devlop]'), message)
}

function pluginLog(message: string): void {
  console.log(chalk.yellow.bold('[PLUGIN]'), message)
}

function printStatus(): void {
  const statusIcon = (status: ServiceStatus): string => {
    if (status === 'running') return chalk.green('●')
    if (status === 'error') return chalk.red('●')
    return chalk.dim('○')
  }

  console.log()
  console.log(chalk.bold('┌─ Fragment Dev ────────────────────────────────┐'))
  for (const [name, def] of Object.entries(SERVICES) as [ServiceName, ServiceDef][]) {
    const pid = processes[name]?.pid ? chalk.dim(` (pid ${processes[name]!.pid})`) : ''
    const status = statuses[name]
    console.log(`│  [${SERVICE_KEYS[name]}] ${def.label.padEnd(11)} ${statusIcon(status)} ${status.padEnd(7)}${pid}`)
  }
  console.log(`│  [4] ${'PLUGINS'.padEnd(11)} ${chalk.yellow('○')} rebuild`)
  console.log(chalk.bold('├───────────────────────────────────────────────┤'))
  console.log(chalk.dim('│  1 server  2 core  3 dashboard  4 rebuild  s status  q quit'))
  console.log(chalk.bold('└───────────────────────────────────────────────┘'))
  console.log()
}

// ─── Process control ─────────────────────────────────────────────────────────

function killService(name: ServiceName): void {
  const proc = processes[name]
  if (proc && !proc.killed) proc.kill('SIGTERM')
  processes[name] = null
  statuses[name] = 'stopped'
}

function startService(name: ServiceName): void {
  killService(name)
  const def = SERVICES[name]
  sys(`Starting ${def.label}...`)

  const child = spawn(def.cmd, def.args, {
    cwd: def.cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  processes[name] = child
  statuses[name] = 'running'

  child.stdout?.on('data', (data: Buffer) => write(def.badge, data))
  child.stderr?.on('data', (data: Buffer) => write(def.badge, data))
  child.on('exit', (code) => {
    processes[name] = null
    statuses[name] = code === 0 ? 'stopped' : 'error'
    sys(`${def.label} exited (code ${code ?? 'null'})`)
  })
}

// ─── Plugin build ─────────────────────────────────────────────────────────────

async function rebuildPlugins(): Promise<void> {
  pluginLog('Rebuilding...')
  await rm(RELEASES_DIR, { recursive: true, force: true })
  await mkdir(RELEASES_DIR, { recursive: true })
  await rm(CORE_PLUGINS_DIR, { recursive: true, force: true })
  await mkdir(CORE_PLUGINS_DIR, { recursive: true })

  for (const pluginPath of await glob([PLUGIN_GLOB], { cwd: ROOT })) {
    await new PluginBuilder({ ...PLUGIN_BUILD_BASE, path: pluginPath }).build()
  }

  for (const file of await glob('plugin-*.js', { cwd: RELEASES_DIR })) {
    await cp(join(RELEASES_DIR, file), join(CORE_PLUGINS_DIR, file))
  }

  pluginLog('Done.')
}

// ─── Plugin file watcher ─────────────────────────────────────────────────────
// server/ e core/ são gerenciados pelo bun --watch; apenas plugins/packages
// precisam de watcher manual pois exigem etapa de build antes do reload.

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const fileWatcher = chokidar.watch(['plugins/**/*', 'packages/**/*'], {
  cwd: ROOT,
  ignored: [
    'plugins/*/src/register.ts',
    'plugins/*/entries.json',
    '**/node_modules/**',
    '**/.git/**',
  ],
  ignoreInitial: true,
})

fileWatcher.on('all', () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void rebuildPlugins().then(() => startService('core'))
  }, PLUGIN_DEBOUNCE_MS)
})

// ─── Keyboard ────────────────────────────────────────────────────────────────

function shutdown(): void {
  sys('Shutting down...')
  for (const name of Object.keys(SERVICES) as ServiceName[]) killService(name)
  void fileWatcher.close()
  if (process.stdin.isTTY) process.stdin.setRawMode(false)
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

if (process.stdin.isTTY) {
  process.stdin.setRawMode(true)
  process.stdin.resume()
}

process.stdin.on('data', (raw: Buffer) => {
  const key = raw.toString()
  if (key === '') return shutdown()
  switch (key) {
  case 'q': shutdown(); break
  case '1': startService('server'); break
  case '2': startService('core'); break
  case '3': startService('dashboard'); break
  case '4': void rebuildPlugins().then(() => startService('core')); break
  case 's': printStatus(); break
  }
})

// ─── Boot ────────────────────────────────────────────────────────────────────

sys('Initializing Fragment dev environment...')
await rebuildPlugins()
startService('server')
startService('core')
startService('dashboard')
printStatus()
