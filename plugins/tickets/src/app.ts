import 'reflect-metadata'
import './types/dependencies.js'

import { Plugin } from 'plugin'
import corePackageJson from '../../../core/package.json' with { type: 'json' }
import { database } from './database/index.js'
import { registerAll } from './register.js'

export default new Plugin({
  dependencies: {
    core: `^${corePackageJson.version}`,
  },
  envs: [
    {
      name: 'teste',
      description: 'Exemplo',
      default: 'exxample',
      required: true,
      type: 'string'
    }
  ],
  setup: async (ctx) => {
    ctx.registerSchema(database)
    await registerAll(ctx)
  },
})