import 'env/loader'

import { Router } from '@/controllers/router.js'
import { rootSource } from '@/database/dataSource.js'
import { Bot } from '@/database/entity/Bot.js'
import Database, { TypeDatabase } from '@/database/entity/Database.js'
import { Role } from '@/database/entity/User.js'
import { randomBytes } from 'crypto'
import { z } from 'zod'

export default new Router({
  name: 'CreateBot',
  description: 'Create a new bot',
  authenticate: Role.Administrator,
  schema: {
    post: z.object({
      name: z.string().max(256),
      enabled: z.boolean().default(true)
    })
  },
  methods: {
    async post({ reply, request, schema }) {
      const database = `${request.user.id}_${randomBytes(12).toString('hex')}`
      const username = randomBytes(12).toString('hex')
      const password = randomBytes(12).toString('hex')
      const bot = Bot.create({
        name: schema.name,
        user: request.user,
        enabled: schema.enabled,
        plugins: [],
        subscriptions: [],
        database: Database.create({
          type: process.env['DATABASE_TYPE'] as TypeDatabase,
          username,
          database,
          password
        })
      })
  
      try {
        await rootSource.query(`CREATE DATABASE IF NOT EXISTS ${database}`)
        await rootSource.query('CREATE USER ?@\'%\' IDENTIFIED BY ?', [username, password])
        await rootSource.query(`GRANT ALL PRIVILEGES ON \`${database}\`.* TO ?@'%'`, [username])
        await rootSource.query('FLUSH PRIVILEGES')
  
        await bot.save()
        
        return reply.status(200).send({
          message: 'Bot created successfully!',
          data: {
            bot,
            user: request.user
          }
        })
      } catch (err) {
        await rootSource.query(`DROP DATABASE IF EXISTS \`${database}\``)
        await rootSource.query('DROP USER IF EXISTS ?@\'%\'', [username])
        await bot.softRemove()
  
        if (err instanceof Error) {
          return reply.status(500).send({
            message: `Internal Server Error: ${err.message}`
          })
        }
      
        return reply.status(500).send({
          message: `Internal Server Error: ${JSON.stringify(err)}`
        })
      }
    }
  }
})