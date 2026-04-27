import { Multipart } from '@/infra/file.js'
import { authenticator } from '@/infra/auth.js'
import { FileEntity } from '@/database/entity/File.js'
import { Plugin } from '@/database/entity/Plugin.js'
import { Release } from '@/database/entity/Release.js'
import { Role } from '@/database/enums.js'
import { storage } from '@/index.js'
import { Fastify } from '@/infra/fastify.js'
import { createHash } from 'crypto'
import { FileType } from 'storage'
import { z } from 'zod'

const uploadSchema = z.object({
  name: z.string().max(128).min(4),
  version: z.string().max(32).min(1),
})

export function registerFileRoutes() {
  Fastify.server
    .post('/plugins/:id', {
      preValidation: (req: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => authenticator(req, reply, [Role.Administrator]),
    }, async (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => {
      const id = Number((request.params as { id?: string }).id)
      if (!id || Number.isNaN(id)) return reply.status(404).send({ message: 'id not specified!' })

      const params = uploadSchema.safeParse(request.query)
      if (!params.success) return reply.status(400).send({ message: params.error.name, error: params.error })

      const data = await new Multipart(request).getSingle()
      if (!data) return reply.status(422).send({ message: 'No files were uploaded!' })

      if (!data.file.type.includes('text/javascript')) {
        return reply.status(422).send({ message: 'Only Javascript files are allowed to be uploaded!' })
      }

      const buffer = Buffer.from(await data.file.arrayBuffer())
      const md5Hash = createHash('md5').update(buffer).digest('hex')
      const sha265Hash = createHash('sha256').update(buffer).digest('hex')

      const plugin = await Plugin.findOne({
        where: { id },
        relations: { releases: { file: true } },
      })
      if (!plugin) return reply.status(404).send({ message: 'Plugin not found!' })

      if (plugin.releases.find((r: Release) => r.file && (r.file.md5 === md5Hash || r.file.sha265 === sha265Hash))) {
        return reply.status(409).send({ message: 'Conflict, there is already a release with the same sha256 or md5!' })
      }

      const fileEntry = await FileEntity.create({
        name: data.file.name,
        mimeType: data.file.type,
        type: FileType.Text,
        size: data.file.size,
        md5: md5Hash,
        sha265: sha265Hash,
      }).save()

      const release = await Release.create({
        name: params.data.name,
        version: params.data.version,
        plugin,
        file: fileEntry,
      }).save()

      await storage.save(fileEntry.sha265, data.file)
      return reply.status(200).send({ message: 'Release created successfully!', data: release })
    })

    .get('/plugins/:id/:version', {
      preValidation: (req: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => authenticator(req, reply, true),
    }, async (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => {
      const params = request.params as { id: string; version: string }
      const id = parseInt(params.id)
      const version = params.version

      if (!id || !version) return reply.status(404).send({ message: 'Id or Version not specified!' })

      const plugin = await Plugin.findOne({
        where: { id, releases: { version } },
        relations: { releases: { file: true } },
      })
      if (!plugin) return reply.status(404).send({ message: 'Plugin not found!' })

      const release = plugin.releases.find((r: Release) => r.version === version)
      if (!release) return reply.status(404).send({ message: 'Release not found!' })

      const stream = await storage.stream(release.file.sha265)

      return reply
        .header('Content-Disposition', `attachment; filename=${release.file.name}`)
        .send(stream)
        .type(release.file.mimeType)
        .code(200)
    })
}
