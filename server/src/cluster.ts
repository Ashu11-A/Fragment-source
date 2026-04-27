import { execSync } from 'child_process'
import cluster from 'cluster'
import { cpus } from 'os'
import { setupPrimary } from '@socket.io/cluster-adapter'

if (process.env.PRODUCTION !== 'true') {
  // Development: single process — preserves sql.js in-memory state across requests
  await import('@/app')
} else if (cluster.isPrimary) {
  setupPrimary()

  console.log(`Master ${process.pid}`)
  execSync('bun run migration:run || true', { stdio: 'inherit' })

  const numCPUs = cpus().length - 1
  for (let index = 0; index < numCPUs; index++) cluster.fork()
} else {
  await import('@/app')
}
