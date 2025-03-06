import { Router } from '@/controllers/router.js'
import { Plugin } from '@/database/entity/Plugin.js'
import { storage } from '@/index.js'
import { z } from 'zod'

const schema = z.object({
  version: z.string().max(32).min(1)
}).optional()

export default new Router({
  name: 'Dowload Plugin Release',
  path: '/plugin/download/:id',
  description: 'Downlaod Release',
  authenticate: true,
  methods: {
    async get({ reply, request }) {
      try {
        const id = Number((request.params as { id?: string }).id)
        if (!id || Number.isNaN(id)) return reply.status(404).send({
          message: 'id not specified!'
        })
  
        const params = schema.safeParse(request.query)
        if (!params.success) {
          return reply.status(400).send({
            message: params.error.name,
            error: params.error
          })
        }
      
        const plugin = await Plugin.findOne({
          where: {
            id
          },
          relations: {
            releases: {
              file: true
            }
          }
        })
        if (!plugin) return reply.status(404).send({ message: 'Plugin not found!' })
  
        const release = params.data?.version
          ? plugin.releases.find((release) => release.version === params.data?.version)
          : plugin.releases.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
        if (!release) return reply.status(404).send({ message: 'Release not found!' })
  
        const stream = await storage.stream(release.file.sha265)
  
        return reply
          .header(
            'Content-Disposition',
            `attachment; filename=${release.file.name}`
          )
          .send(stream)
          .type(release.file.mimeType)
          .code(200)
      } catch (err) {
        if (err instanceof Error) {
          return reply.status(500).send({ message: err.message })
        }
    
        return reply.status(500).send({ message: `Internal Server Error: ${JSON.stringify(err)}` })
      }
    }
  }
})