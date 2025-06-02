import { Router } from '@/controllers/router.js'
import { Plugin } from '@/database/entity/Plugin.js'
import { Role } from '@/database/enums'
import { z } from 'zod'

export default new Router({
  name: 'CreatePlugin',
  description: 'Create plugin',
  schema: {
    post: z.object({
      name: z.string(),
      price: z.number()
    })
  },
  authenticate: [Role.Administrator],
  methods: {
    async post({ reply, schema }) {
      const plugin = await Plugin.create({
        name: schema.name,
        price: schema.price,
        subscriptions: [],
        releases: [],
        bots: [],
      }).save()
      
      return reply.status(200).send({
        message: 'Plugin created successfully!',
        data: plugin
      })
    }
  }
})