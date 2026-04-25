import 'dotenv/config'
import 'env/loader'
import 'reflect-metadata'

import { Fastify } from './controllers/fastify.js'
import Database from './database/dataSource.js'
import { registerArtifactRoutes } from './scripts/artifactRoutes.js'
import { registerFileRoutes } from './scripts/fileRoutes.js'

const fastify = new Fastify({ port: Number(process.env['PORT']) || 3000, host: '0.0.0.0' })

console.log('[db] connecting...')
await Database.initialize()
console.log('[db] connected')

await import('./scripts/register.js')

fastify.config()
registerFileRoutes()
registerArtifactRoutes()
await fastify.listen()
