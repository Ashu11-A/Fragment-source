import { Router } from '@/controllers/router.js'
import { Plugin } from '@/database/entity/Plugin.js'
import { storage } from '@/index.js'

export default new Router({
  name: 'Dowload Plugin Release',
  path: '/plugins/:id/:version',
  description: 'Downlaod Release',
  authenticate: true,
  methods: {
    async get({ reply, request }) {
      const params = request.params as { id: string, version: string }
      const id = parseInt(params.id)
      const version = params.version

      if (!id || !version) return reply.status(404).send({
        message: 'Id or Version not specified!'
      })
    
      const plugin = await Plugin.findOne({
        where: {
          id,
          releases: {
            version
          }
        },
        relations: {
          releases: {
            file: true
          }
        }
      })
      if (!plugin) return reply.status(404).send({ message: 'Plugin not found!' })

      const release = plugin.releases.find((release) => release.version === params.version)
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
    }
  }
})