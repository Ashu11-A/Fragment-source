import { File } from '@/database/entity/File.js'
import { Multipart } from '@/infra/file.js'
import { authenticator } from '@/infra/auth.js'
import { Plugin } from '@/database/entity/Plugin.js'
import { Role } from '@/database/enums.js'
import { Fastify } from '@/infra/fastify.js'
import { createHash } from 'crypto'
import { FileType } from 'storage'
import { z } from 'zod'
import { storage } from '@/singletons'

const createPluginSchema = z.object({
  name: z.string().max(256).min(1),
  price: z.coerce.number().nonnegative().default(0),
  description: z.string().max(20_000).optional(),
})

const uploadSchema = z.object({
  name: z.string().max(128).min(4),
})

export function registerFileRoutes() {
  Fastify.server
    .post('/plugins', {
      preValidation: (req: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => authenticator(req, reply, [Role.Administrator]),
    }, async (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => {
      const params = createPluginSchema.safeParse(request.query)
      if (!params.success) return reply.status(400).send({ message: params.error.name, error: params.error })

      const data = await new Multipart(request).getSingle()
      if (!data) return reply.status(422).send({ message: 'No files were uploaded!' })

      if (!data.file.type.includes('text/javascript') && !data.file.name.endsWith('.js')) {
        return reply.status(422).send({ message: 'Only Javascript files are allowed to be uploaded!' })
      }

      const buffer = Buffer.from(await data.file.arrayBuffer())
      const sha256Hash = createHash('sha256').update(buffer).digest('hex')

      const existingPlugin = await Plugin.findOne({
        where: { icon: { sha256: sha256Hash } },
        relations: { icon: true },
      })
      if (existingPlugin) {
        return reply.status(409).send({ message: 'Conflict, there is already a plugin with the same bundle hash!' })
      }

      const plugin = await Plugin.create({
        name: params.data.name,
        price: params.data.price,
        description: params.data.description ?? null,
        readme: null,
        published: true,
        icon: File.create({
          name: data.file.name,
          size: data.file.size,
          type: FileType.Text,
          mimeType: data.file.type || 'text/javascript',
          sha256: sha256Hash,
        }),
      }).save()

      await storage.save(sha256Hash, data.file)
      return reply.status(200).send({ message: 'Plugin created successfully!', data: { plugin } })
    })

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

      const plugin = await Plugin.findOne({
        where: { id },
        relations: { icon: true },
      })
      if (!plugin) return reply.status(404).send({ message: 'Plugin not found!' })

      const buffer = Buffer.from(await data.file.arrayBuffer())
      const sha256Hash = createHash('sha256').update(buffer).digest('hex')

      if (plugin.icon?.sha256 === sha256Hash) {
        return reply.status(409).send({ message: 'Conflict, the plugin already has this bundle!' })
      }

      plugin.icon = File.create({
        name: data.file.name,
        size: data.file.size,
        type: FileType.Text,
        mimeType: data.file.type || 'text/javascript',
        sha256: sha256Hash,
      })
      await plugin.save()

      await storage.save(sha256Hash, data.file)
      return reply.status(200).send({ message: 'Plugin bundle updated successfully!', data: plugin })
    })

    .get('/plugins/:id/bundle', {
      preValidation: (req: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => authenticator(req, reply, true),
    }, async (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => {
      const id = parseInt((request.params as { id: string }).id)
      if (!id) return reply.status(404).send({ message: 'Id not specified!' })

      const plugin = await Plugin.findOne({
        where: { id },
        relations: { icon: true },
      })
      if (!plugin) return reply.status(404).send({ message: 'Plugin not found!' })
      if (!plugin.icon) return reply.status(404).send({ message: 'Plugin has no bundle!' })

      const stream = await storage.stream(plugin.icon.sha256)

      return reply
        .header('Content-Disposition', `attachment; filename=${plugin.icon.name}`)
        .send(stream)
        .type(plugin.icon.mimeType)
        .code(200)
    })
}
