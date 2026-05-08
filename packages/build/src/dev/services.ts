import { type ChildProcess, spawn, execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import chalk from 'chalk'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type ServiceDefinition, type ServiceName, type ServiceStatus } from '../types/index'

// Resolve workspace root relative to this file (packages/build/src/dev/ -> workspace root)
const root = join(dirname(fileURLToPath(import.meta.url)), '../../../../')

// Resolve bun path: prefer current executable if it's bun, otherwise try 'bun' from PATH
function resolveBunPath(): string {
  const execPath = process.execPath
  if (execPath.includes('bun') || execPath.endsWith('/bun')) {
    return execPath
  }
  // Fall back to letting PATH resolve 'bun'
  return 'bun'
}

const bunPath = resolveBunPath()

export function cleanupPorts(ports: number[]): void {
  for (const port of ports) {
    try {
      if (process.platform === 'win32') {
        // Windows: find PIDs using netstat, then kill them
        try {
          const output = execSync(`netstat -ano | findstr :${port}`, { shell: true, encoding: 'utf8' })
          const lines = output.split('\n').filter(line => line.includes(`:${port}`))
          for (const line of lines) {
            const parts = line.trim().split(/\s+/)
            const pid = parts[parts.length - 1]
            if (pid && /^\d+$/.test(pid)) {
              execSync(`taskkill /PID ${pid} /F`, { shell: true, stdio: 'ignore' })
            }
          }
        } catch {
          // ignore - port may not be in use
        }
      } else {
        // Linux/macOS: use lsof
        execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, { shell: true, stdio: 'ignore' })
      }
    } catch {
      // ignore errors - port may not be in use
    }
  }
}

export const services: Record<ServiceName, ServiceDefinition> = {
  server: {
    label: 'SERVER',
    badge: chalk.blue.bold('[SERVER]'),
    cwd: join(root, 'server'),
    cmd: bunPath,
    args: ['--watch', 'src/app.ts'],
  },
  daemon: {
    label: 'DAEMON',
    badge: chalk.green.bold('[DAEMON]'),
    cwd: join(root, 'daemon'),
    cmd: 'cargo',
    args: ['run'],
  },
  dashboard: {
    label: 'DASHBOARD',
    badge: chalk.cyan.bold('[DASH  ]'),
    cwd: join(root, 'dashboard'),
    cmd: bunPath,
    args: ['run', 'dev'],
  },
}

export const serviceKeys: Record<ServiceName, string> = { server: '1', daemon: '2', dashboard: '3' }

export const processes: Record<ServiceName, ChildProcess | null> = { server: null, daemon: null, dashboard: null }
export const statuses: Record<ServiceName, ServiceStatus> = { server: 'idle', daemon: 'idle', dashboard: 'idle' }

let statusChangeCallback: (() => void) | null = null
let logLineCallback: ((source: string, line: string) => void) | null = null

export function onStatusChange(cb: () => void): void {
  statusChangeCallback = cb
}

export function onLogLine(cb: (source: string, line: string) => void): void {
  logLineCallback = cb
}

export function writeOutput(source: string, badge: string, data: Buffer): void {
  const text = data.toString().replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  for (const line of text.split('\n')) {
    if (line.trim()) {
      const formatted = `${badge} ${line}`
      logLineCallback?.(source, formatted)
    }
  }
}

export function logSystem(message: string): void {
  logLineCallback?.('devlop', `[devlop] ${message}`)
}

export function logPlugin(message: string): void {
  logLineCallback?.('plugin', `[plugin] ${message}`)
}

export function logBuildLine(line: string): void {
  logLineCallback?.('plugin', line)
}

export function killService(name: ServiceName): void {
  const proc = processes[name]
  if (proc && !proc.killed) proc.kill('SIGTERM')
  processes[name] = null
  statuses[name] = 'stopped'
  statusChangeCallback?.()
}

export function startService(name: ServiceName): void {
  killService(name)
  const definition = services[name]

  // Validate working directory exists
  if (!existsSync(definition.cwd)) {
    logSystem(`Cannot start ${definition.label}: directory '${definition.cwd}' does not exist`)
    statuses[name] = 'error'
    statusChangeCallback?.()
    return
  }

  logSystem(`Starting ${definition.label}...`)

  // Use shell: true to ensure PATH resolution works in all contexts (VS Code terminal, etc.)
  const child = spawn(definition.cmd, definition.args, {
    cwd: definition.cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
    shell: true,
  })

  child.on('error', (err) => {
    processes[name] = null
    statuses[name] = 'error'
    statusChangeCallback?.()
    logSystem(`Failed to start ${definition.label}: ${err.message}`)
  })

  processes[name] = child
  statuses[name] = 'running'
  statusChangeCallback?.()

  child.stdout?.on('data', (data: Buffer) => writeOutput(name, definition.badge, data))
  child.stderr?.on('data', (data: Buffer) => writeOutput(name, definition.badge, data))
  child.on('exit', (code: number | null) => {
    processes[name] = null
    statuses[name] = code === 0 ? 'stopped' : 'error'
    statusChangeCallback?.()
    logSystem(`${definition.label} exited (code ${code ?? 'null'})`)
  })
}
