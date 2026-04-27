import readline from 'node:readline'
import chalk from 'chalk'
import { type ServiceName } from '../types/index'
import { logSystem, services } from './services'

export async function promptStartupSelection(): Promise<ServiceName[]> {
  const items = [
    { name: 'server' as ServiceName, label: services.server.label, checked: true },
    { name: 'core' as ServiceName, label: services.core.label, checked: true },
    { name: 'dashboard' as ServiceName, label: services.dashboard.label, checked: true },
  ]

  if (!process.stdin.isTTY) return items.map(item => item.name)

  let selectedIndex = 0

  const render = () => {
    readline.cursorTo(process.stdout, 0, 0)
    readline.clearScreenDown(process.stdout)
    console.log(chalk.bold('┌─ Fragment Dev ────────────────────────────────┐'))
    console.log(chalk.bold('│  Select services to initialize:              │'))
    console.log(chalk.bold('├───────────────────────────────────────────────┤'))

    for (let index = 0; index < items.length; index++) {
      const item = items[index]
      const checkbox = item.checked ? chalk.green('[x]') : chalk.dim('[ ]')
      const cursor = index === selectedIndex ? chalk.cyan('>') : ' '
      const label = index === selectedIndex ? chalk.bold(item.label) : item.label
      console.log(`│ ${cursor} ${checkbox} ${label.padEnd(36)}│`)
    }

    console.log(chalk.bold('├───────────────────────────────────────────────┤'))
    console.log(chalk.dim('│  ↑/↓ navigate  SPACE toggle  ENTER confirm   │'))
    console.log(chalk.bold('└───────────────────────────────────────────────┘'))
  }

  return new Promise((resolve) => {
    process.stdin.setRawMode(true)
    process.stdin.resume()

    const onData = (raw: Buffer) => {
      const byte = raw[0]

      if (byte === 3) {
        cleanup()
        process.exit(0)
        return
      }

      if (byte === 13 || byte === 10) {
        cleanup()
        resolve(items.filter(item => item.checked).map(item => item.name))
        return
      }

      if (byte === 32) {
        items[selectedIndex].checked = !items[selectedIndex].checked
        render()
        return
      }

      if (byte === 27 && raw[1] === 91) {
        if (raw[2] === 65) {
          selectedIndex = (selectedIndex - 1 + items.length) % items.length
          render()
        } else if (raw[2] === 66) {
          selectedIndex = (selectedIndex + 1) % items.length
          render()
        }
      }
    }

    const cleanup = () => {
      process.stdin.off('data', onData)
      process.stdin.setRawMode(false)
      process.stdin.pause()
      readline.cursorTo(process.stdout, 0, 0)
      readline.clearScreenDown(process.stdout)
    }

    process.stdin.on('data', onData)
    render()
  })
}
