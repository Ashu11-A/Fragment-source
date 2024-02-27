import { client, db } from '@/app'
import { Crons } from '@/classes/Crons'
import { Pterodactyl } from '@/classes/Pterodactyl'
import axios from 'axios'
import { EmbedBuilder, type TextChannel } from 'discord.js'

interface NodeData {
  id: number
  name: string
  location: any
  allocations: any
  maintenance: boolean
  total_servers: any
  memory_min: number
  memory_max: number
  disk_min: number
  disk_max: number
  ip: string
}

export async function genEmbeds (options: {
  guildId: string
  embedInit?: boolean
}): Promise<EmbedBuilder[] | undefined> {
  const { embedInit, guildId } = options
  const embeds: EmbedBuilder[] = []
  const { url, tokenPanel: token } = (await db.payments.get(
    `${guildId}.config.pterodactyl`
  )) ?? { url: undefined, token: undefined }

  // Função para verificar o status de uma URL
  async function checkStatus (url: string): Promise<boolean> {
    return await axios.get(url)
      .then((res) => {
        if (res?.status === 401) {
          return true
        } else {
          return false
        }
      })
      .catch((error) => {
        if (error?.response?.status === 401) {
          return true
        } else {
          return false
        }
      })
  }

  // Obtém as informações de estatísticas dos nós
  async function getNodeStats (): Promise<NodeData[] | undefined> {
    if (token === undefined || url === undefined) return
    const pteroConect = new Pterodactyl({ token, url })
    const nodesList = await pteroConect.getNodes()
    if (nodesList === undefined || axios.isAxiosError(nodesList)) return

    const nodes = nodesList.map(async (node) => {
      // const configNode = pteroConect.getConfigNode({ id: node.attributes.id })

      const body = {
        id: node.attributes.id,
        name: node.attributes.name,
        location: node.attributes.relationships.location.attributes.short,
        allocations: node.attributes.relationships.allocations.data.length,
        maintenance: node.attributes.maintenance_mode,
        total_servers: node.attributes.relationships.servers.data.length,
        memory_min: node.attributes.allocated_resources.memory,
        memory_max: node.attributes.memory,
        disk_min: node.attributes.allocated_resources.disk,
        disk_max: node.attributes.disk,
        ip: node.attributes.fqdn
      }

      return body
    })

    return await Promise.all(nodes)
  }

  const nodeStats = await getNodeStats()
  // const backupInfo = await axios({ url: config.Start.SystemStatus.API + '/backup-size' })

  if (nodeStats === undefined) return

  if (embedInit === true) {
    embeds.push(
      new EmbedBuilder({
        title: 'Status do Sistema',
        description: '⚙️ Informação do Sistema',
        //     fields: [
        //       {
        //         name: '📁 Backup Espelhado:',
        //         value:
        //               '```' +
        //               `↳ ${backupInfo?.data?.backup?.espelhado ?? 'ERROR 404'}` +
        //               '```',
        //         inline: true
        //       },
        //       {
        //         name: '📦 Backup Completo:',
        //         value:
        //               '```' +
        //               `↳ ${backupInfo?.data?.backup?.completo ?? 'ERROR 404'}` +
        //               '```',
        //         inline: true
        //       }
        //     ],
        timestamp: new Date()
      }).setColor('Random')
    )
  }

  for (const node of nodeStats) {
    const status = (await checkStatus(
      'https://' + node?.ip + ':8080'
    ))
      ? '🟢 Online'
      : '🔴 Offline'
    const embed = new EmbedBuilder()
      .setTitle(
                  `${node?.location ?? 'ERROR 404'}, ${
                    node?.name ?? 'ERROR 404'
                  }`
      )
      .addFields(
        {
          name: '⚙️ Status:',
          value: '```' + `↳ ${status ?? 'ERROR 404'}` + '```',
          inline: true
        },
        {
          name: '🛠 Está em Manutenção?',
          value:
                '```' +
                `↳ ${
                  (node?.maintenance ? 'Sim' : 'Não') ?? 'ERROR 404'
                }` +
                '```',
          inline: true
        },
        {
          name: '💎 Servidores Hospedados:',
          value: '```' + `↳ ${node?.total_servers ?? 'ERROR 404'}` + '```',
          inline: true
        }
      )
      .setColor(node?.maintenance ? 'Orange' : status === '🟢 Online' ? 'Green' : 'Red')

    embeds.push(embed)
  }
  return embeds
}

new Crons({
  name: 'statusPtero',
  cron: '*/15 * * * * *',
  once: false,
  async exec (cron, interval) {
    if (interval === undefined) return
    const guilds = client.guilds.cache

    for (const [, guild] of guilds.entries()) {
      const enabled = await db.system.get(`${guild.id}.status.PteroStatus`)
      if (enabled === false) return
      try {
        const embeds: EmbedBuilder[] = []
        const now = new Date()
        const futureTime = new Date(now.getTime() + 15000)
        const futureTimeString = `<t:${Math.floor(futureTime.getTime() / 1000)}:R>`

        embeds.push(
          new EmbedBuilder({
            title: 'Status do Sistema',
            description: `⚙️ Informação do Sistema | Próxima atualização: ${futureTimeString}`,
            timestamp: new Date()
          }).setColor('Random')
        )

        const newEmbeds = await genEmbeds({ guildId: guild.id })
        if (newEmbeds === undefined) return

        embeds.push(...newEmbeds)

        const messageId = await db.messages.get(`${guild.id}.system.pterodactyl.messageId`)
        const channelId = await db.messages.get(`${guild.id}.system.pterodactyl.channelId`)

        if (channelId !== undefined) {
          const channel = guild?.channels.cache.get(channelId) as TextChannel
          channel.messages.fetch(messageId)
            .then(async (msg) => { await msg.edit({ embeds }) })
            .catch(async () => {
              await channel.send({ embeds }).then(async (msg) => {
                return await db.messages.set(`${guild.id}.system.pterodactyl.messageId`, msg.id)
              })
            })
        }
      } catch (err) {
        console.log(err)
      }
    }
  }
})
