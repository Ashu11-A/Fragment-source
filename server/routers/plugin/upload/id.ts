import { Multipart } from '@/controllers/file.js'
import { Router } from '@/controllers/router.js'
import { FileEntity } from '@/database/entity/File.js'
import { Plugin } from '@/database/entity/Plugin.js'
import { Release } from '@/database/entity/Release.js'
import { Role } from '@/database/entity/User.js'
import { storage } from '@/index.js'
import { FileType } from '@/storage/index.js'
import { createHash } from 'crypto'
import { z } from 'zod'

const schema = z.object({
  name: z.string().max(128).min(4),
  version: z.string().max(32).min(1)
})

export default new Router({
  name: 'UploadPluginRelease',
  path: '/plugin/upload/:id',
  description: 'Upload Releases',
  authenticate: [Role.Administrator],
  methods: {
    async post({ reply, request }) {
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
      
        const file = await new Multipart(request).getSingle()
        if (!file) return reply.status(422).send({
          message: 'No files were uploaded!'
        })
      
        if (!file.type.includes('text/javascript')) {
          return reply.status(422).send({
            message: 'Only Javascript files are allowed to be uploaded!'
          })
        }
      
        const buffer = Buffer.from(await file.arrayBuffer())
      
        const md5Hash = createHash('md5').update(buffer).digest('hex')
        const sha265Hash = createHash('sha256').update(buffer).digest('hex')
      
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
      
        if (plugin.releases.find((releases) => 
          releases.file &&
          (releases.file.md5 === md5Hash || releases.file.sha265 === sha265Hash)
        )) {
          return reply.status(409).send({
            message: 'Conflict, there is already a release with the same sha256 or md5!'
          })
        }
      
        const fileEntry = await FileEntity.create({
          name: file.name,
          mimeType: file.type,
          type: FileType.Text,
          size: file.size,
          md5: md5Hash,
          sha265: sha265Hash,
        }).save()
      
        const release = await Release.create({
          name: params.data.name,
          version: params.data.version,
          plugin: plugin,
          file: fileEntry
        }).save()
      
        await storage.save(fileEntry.sha265, file)
        return reply.status(200).send({
          message: 'Release created successfully!',
          data: release
        })
      } catch (err) {
        if (err instanceof Error) {
          return reply.status(500).send({ message: `Internal Server Error: ${err.message}` })
        }
    
        return reply.status(500).send({ message: `Internal Server Error: ${JSON.stringify(err)}` })
      }
    }
  }
})