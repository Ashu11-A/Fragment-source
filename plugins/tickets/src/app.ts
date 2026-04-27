import './types/dependencies.js'

import 'reflect-metadata'

import { Plugin } from 'plugin'
import { database } from './database/index.js'
import { registerAll } from './register.js'

export default new Plugin({
  frameworkVersion: '^1.0.0',
  setup: async (ctx) => {
    ctx.registerSchema(database)
    await registerAll(ctx)
  },
})