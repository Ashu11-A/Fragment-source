import { Discord } from '@/discord/Client'
import { type CommandData, DiscordCommand } from '@/discord/Commands'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { cwd } from 'process'
import { type Socket } from 'socket.io'
import { type BaseEntity, type FindOptionsWhere, type ObjectId } from 'typeorm'
import { env } from '..'
import { Database } from './database'
import { Plugins } from './plugins'

interface EventOptions {
  client: Socket
}

interface EntityImport<T extends typeof BaseEntity> { default: T }

export class Event {
  private readonly options
  constructor (options: EventOptions) {
    this.options = options
  }

  async controller () {
    this.options.client.on('disconnect', async () => { await this.disconnect() })
    this.options.client.onAny(async (eventName: string, args) => {
      const eventNameSplit = eventName.split('_')

      if (eventNameSplit.includes('database')) {
        const { type, table } = args as { type: string, table: string }
        const { default: Entity } = await import(join(cwd(), `entries/${table}`)) as EntityImport<typeof BaseEntity>
        switch (type) {
          case 'create': {
            const data = Entity.create(args.entity)
            await Entity.save(data).then(() => {
              console.log('Usuário salvo com sucesso!')
            })

            this.options.client.emit(eventName, data)
            break
          }
          case 'find': this.options.client.emit(eventName, await Entity.find(args.options)); break
          case 'findBy': this.options.client.emit(eventName, await Entity.findBy(args.where as FindOptionsWhere<typeof BaseEntity>)); break
          case 'findOne': this.options.client.emit(eventName, await Entity.findOne(args.options)); break
          case 'delete': this.options.client.emit(eventName, await Entity.delete(args.criteria as string | string[] | number | number[] | Date | Date[] | ObjectId | ObjectId[] | FindOptionsWhere<typeof BaseEntity>)); break
          case 'count': this.options.client.emit(eventName, await Entity.count(args.options))
        }
        return
      }

      switch (eventName) {
        case 'metadata': {
          // Apenas o ultimo iniciará o Discord [Plugins.loaded < Plugins.plugins]
          if (Plugins.loaded < (Plugins.plugins - 1)) {
            Plugins.loaded = Plugins.loaded + 1
            break
          }
          console.log(`✅ Plugin ${args.name} inicializado com sucesso!`)

          if (Discord?.client === undefined) {
            if (Plugins.loaded === 0 && Plugins.plugins === 0) {
              console.log('\n🚨 Modo de desenvolvimento, iniciando Discord...\n')
            } else {
              console.log(`\n🚩 Último plugin carregado (${Plugins.loaded + 1}/${Plugins.plugins}), iniciando Discord...\n`)
            }

            const client = new Discord()
            client.createClient()
            await client.start()
          }

          if (Database?.client === undefined) {
            const client = new Database({
              type: 'mysql',
              host: 'node.seventyhost.net',
              port: 3306,
              username: 'u1692_A71YtsRYy2',
              password: 't2y9gseoHzo+mm!VX=bva9Gt',
              database: 's1692_SeventyHost'
            })

            await client.create()
            client.start()
          }
          break
        }
        case 'commands': {
          console.log(`√ Registrando ${eventName}, ${args.length} ${args.length === 1 ? 'elemento' : 'elementos'}`)
          if (args.length === 0) break
          for (const command of (args as Array<CommandData<boolean>>)) {
            DiscordCommand.all.set(command.name, command)
          }
          break
        }
        case 'components': console.log(`√ Registrando ${eventName}, ${args.length} ${args.length === 1 ? 'elemento' : 'elementos'}`); break
        case 'events': console.log(`√ Registrando ${eventName}, ${args.length} ${args.length === 1 ? 'elemento' : 'elementos'}`); break
        case 'entries':
          const { code, fileName } = args as { fileName: string, code: string }
          const path = join(process.cwd(), `entries/${fileName}`)

          await writeFile(path, code, { encoding: 'utf-8' })
          const entry = await import(path)

          Database.entries.push(entry)
          break
      }
    })
  }

  async connected () {
    const { client } = this.options
    client.emit('discord', env?.BOT_TOKEN)
    client.emit('database', env?.BOT_TOKEN)
  }

  async disconnect () {
    const { client } = this.options
    console.info(`Plugin Desconectado: ${client.id}`)
  }
}
