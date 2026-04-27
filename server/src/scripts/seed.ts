import 'dotenv/config'
import 'env/loader'
import 'reflect-metadata'

import Database from '@/database/dataSource.js'
import { seedDatabase } from '@/scripts/register.js'

console.log('[seed] connecting to database...')
await Database.initialize()
console.log('[seed] connected')

await seedDatabase()
console.log('[seed] done')
process.exit(0)
