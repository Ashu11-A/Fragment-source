import { type ChildProcess, spawn } from 'node:child_process'
import chalk from 'chalk'
import { join } from 'node:path'
import { type ServiceDefinition, type ServiceName, type ServiceStatus } from '../types/index'

const root = process.cwd()

export const services: Record<ServiceName, ServiceDefinition> = {
  server: {
    label: 'SERVER',
    badge: chalk.blue.bold('[SERVER]'),
    cwd: join(root, 'server'),
    cmd: 'bun',
    args: ['--watch', '--inspect=ws://localhost:6499', 'src/app.ts'],
  },
  core: {
    label: 'CORE',
    badge: chalk.green.bold('[CORE  ]'),
    cwd: join(root, 'core'),
    cmd: 'bun',
    args: ['--watch', 'src/app.ts'],
  },
  dashboard: {
    label: 'DASHBOARD',
    badge: chalk.cyan.bold('[DASH  ]'),
    cwd: join(root, 'dashboard'),
    cmd: 'bun',
    args: ['run', 'dev'],
  },
}

export const serviceKeys: Record<ServiceName, string> = { server: '1', core: '2', dashboard: '3' }

export const processes: Record<ServiceName, ChildProcess | null> = { server: null, core: null, dashboard: null }
export const statuses: Record<ServiceName, ServiceStatus> = { server: 'idle', core: 'idle', dashboard: 'idle' }

export function writeOutput(badge: string, data: Buffer): void {
  const text = data.toString().replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  for (const line of text.split('\n')) {
    if (line.trim()) process.stdout.write(`${badge} ${line}\n`)
  }
}

export function logSystem(message: string): void {
  console.log(chalk.magenta.bold('[devlop]'), message)
}

export function logPlugin(message: string): void {
  console.log(chalk.yellow.bold('[PLUGIN]'), message)
}

export function printStatus(): void {
  const statusIcon = (status: ServiceStatus): string => {
    if (status === 'running') return chalk.green('●')
    if (status === 'error') return chalk.red('●')
    return chalk.dim('○')
  }

  console.log()
  console.log(chalk.bold('┌─ Fragment Dev ────────────────────────────────┐'))
  for (const [name, definition] of Object.entries(services) as [ServiceName, ServiceDefinition][]) {
    const pid = processes[name]?.pid ? chalk.dim(` (pid ${processes[name]!.pid})`) : ''
    const status = statuses[name]
    console.log(`│  [${serviceKeys[name]}] ${definition.label.padEnd(11)} ${statusIcon(status)} ${status.padEnd(7)}${pid}`)
  }
  console.log(`│  [4] ${'PLUGINS'.padEnd(11)} ${chalk.yellow('○')} rebuild`)
  console.log(chalk.bold('├───────────────────────────────────────────────┤'))
  console.log(chalk.dim('│  1 server  2 core  3 dashboard  4 rebuild  s status  q quit'))
  console.log(chalk.bold('└───────────────────────────────────────────────┘'))
  console.log()
}

export function killService(name: ServiceName): void {
  const proc = processes[name]
  if (proc && !proc.killed) proc.kill('SIGTERM')
  processes[name] = null
  statuses[name] = 'stopped'
}

export function startService(name: ServiceName): void {
  killService(name)
  const definition = services[name]
  logSystem(`Starting ${definition.label}...`)

  const child = spawn(definition.cmd, definition.args, {
    cwd: definition.cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  processes[name] = child
  statuses[name] = 'running'

  child.stdout?.on('data', (data: Buffer) => writeOutput(definition.badge, data))
  child.stderr?.on('data', (data: Buffer) => writeOutput(definition.badge, data))
  child.on('exit', (code: number | null) => {
    processes[name] = null
    statuses[name] = code === 0 ? 'stopped' : 'error'
    logSystem(`${definition.label} exited (code ${code ?? 'null'})`)
  })
}
