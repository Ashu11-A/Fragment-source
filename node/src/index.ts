import { NodeManager } from './manager.js'
import { NodeConfig } from './websocket/client.js'
import { config } from 'dotenv'

config()

function parseArgs(): NodeConfig {
  const args = process.argv.slice(2)
  const token = args.find((_, index) => args[index - 1] === '--token') || ''
  const port = parseInt(
    args.find((_, index) => args[index - 1] === '--port') || '8080',
    10
  )
  const ip = args.find((_, index) => args[index - 1] === '--ip') || '0.0.0.0'
  const serverUrl =
    args.find((_, index) => args[index - 1] === '--server') ||
    process.env.SERVER_URL ||
    'ws://localhost:3500'

  if (!token) {
    console.error('Usage: node dist/index.js --token <token> --port <port> --ip <ip> [--server <ws-url>]')
    process.exit(1)
  }

  return { token, port, ip, serverUrl }
}

async function main(): Promise<void> {
  const nodeConfig = parseArgs()
  const manager = new NodeManager({
    nodeConfig,
    checkIntervalMs: 30000,
  })

  await manager.start()

  process.on('SIGINT', () => {
    console.log('\n[node] Shutting down...')
    manager.stop()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    manager.stop()
    process.exit(0)
  })
}

main().catch((error) => {
  console.error('[node] Fatal error:', error)
  process.exit(1)
})
