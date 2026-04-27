import chokidar from 'chokidar'
import { killService, logSystem, printStatus, processes, services, startService, statuses } from './dev/services'
import { rebuildPlugins } from './dev/plugins'
import { promptStartupSelection } from './dev/ui'

const pluginDebounceMs = 400

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const fileWatcher = chokidar.watch(['plugins/**/*', 'packages/**/*'], {
  cwd: process.cwd(),
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
  }, pluginDebounceMs)
})

function shutdown(): void {
  logSystem('Shutting down...')
  for (const name of Object.keys(services) as Array<keyof typeof services>) killService(name)
  void fileWatcher.close()
  if (process.stdin.isTTY) process.stdin.setRawMode(false)
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

logSystem('Initializing Fragment dev environment...')
await rebuildPlugins()

const selectedServices = await promptStartupSelection()
for (const name of selectedServices) startService(name)

if (process.stdin.isTTY) {
  process.stdin.setRawMode(true)
  process.stdin.resume()
}

process.stdin.on('data', (raw: Buffer) => {
  const key = raw.toString()
  if (key === ' ') return shutdown()
  switch (key) {
  case 'q': shutdown(); break
  case '1': startService('server'); break
  case '2': startService('core'); break
  case '3': startService('dashboard'); break
  case '4': void rebuildPlugins().then(() => startService('core')); break
  case 's': printStatus(); break
  }
})

printStatus()
