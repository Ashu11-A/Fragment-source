import 'reflect-metadata'

import { Plugin } from 'plugin'
import corePackageJson from '../../../core/package.json' with { type: 'json' }
import { database } from './database/index.js'
import { registerAll } from './register.js'

export default new Plugin({
  dependencies: {
    core: `^${corePackageJson.version}`,
  },
  setup: async (ctx) => {
    ctx.registerSchema(database)
    await registerAll(ctx)
  },
})