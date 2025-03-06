import { Router } from '@/controllers/router.js'
import { Plugin } from '@/database/entity/Plugin.js'

export default new Router({
  name: 'ListPlugins',
  description: 'List Plugins',
  authenticate: true,
  methods: {
    async get({ reply }) {
      const plugins = await Plugin.find()
  
      return reply.status(200).send({
        message: 'Plugin list request successful!',
        data: plugins
      })
    }
  }
})