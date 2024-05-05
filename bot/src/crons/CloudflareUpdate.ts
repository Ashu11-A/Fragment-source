import { client, core, db } from '@/app'
import { Crons } from '@/classes/Crons'
import axios from 'axios'
import Cloudflare from 'cloudflare'
import { codeBlock, EmbedBuilder, TextChannel } from 'discord.js'
import { existsSync } from 'fs'
import { resolve } from 'path'

interface Response {
  ipString: string
  ipType: 'IPv4' | 'IPv6'
}

interface DataTokens {
  email?: string
  global_api_key?: string
}

let warn: boolean = true

new Crons({
  name: 'cloudflare',
  cron: '0 */1 * ? * *',
  once: false,
  async exec (cron, interval) {
    if (interval === undefined) return

    const developmentEnvPath = resolve(process.cwd(), '.env.development')
    const dev = existsSync(developmentEnvPath)

    if (dev) {
      if (warn) {
        core.warn('Modo develop ativo! Pulando sistema de atualização de IP do Cloudflare')
        warn = !warn
      }
      return
    }

    const response = await axios.get('https://api-bdc.net/data/client-ip')

    if (response.status !== 200) {
      core.error('Ocorreu um erro ao tentar determinar o seu IP')
      return
    }

    const guilds = client.guilds.cache
    const { ipString: newIp } = response.data as Response

    for (const guild of guilds.values()) {
      const { ipString: oldIp } = (await db.cloudflare.get(`${guild.id}.saved`) ?? { ipString: undefined, ipType: undefined }) as Response

      if (oldIp !== undefined && oldIp !== newIp) {
        await db.cloudflare.set(`${guild.id}.saved`, response.data)
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        const { email, global_api_key } = (await db.cloudflare.get(`${guild.id}.keys`) ?? { email: undefined, global_api_key: undefined }) as DataTokens
        const channelId = await db.cloudflare.get(`${guild.id}.config.channelId`) as string | undefined
        let channel: TextChannel | undefined | null
        const records: Record<string, Array<{ name: string, type: string, id: string }>> = {}

        if (channelId !== undefined) {
          channel = await guild.channels.fetch(channelId) as TextChannel | null
        }

        core.warn(`Houve uma alteração no ip! ${oldIp} --> ${newIp}`)

        if (email === undefined || global_api_key === undefined) return

        const cloudflare = new Cloudflare({
          apiEmail: email,
          apiKey: global_api_key
        })

        const zones = await cloudflare.zones.list({ per_page: 999 })

        for (const zone of zones.result) {
          const dnsList = await cloudflare.dns.records.list({ zone_id: zone.id, type: 'A', per_page: 999 })

          for (const { name, type, content, zone_id, id } of dnsList.result) {
            if (id === undefined) continue
            if (content !== oldIp) continue
            if (type !== 'A') continue

            await cloudflare.dns.records.edit(id, {
              content: newIp,
              name,
              type,
              zone_id: zone_id ?? zone.id
            }).then(async () => {
              records[zone.name] = [
                ...records[zone_id ?? zone.id],
                { name, type, id }
              ]
              core.info(`Alterando o ip do records: ${name}!`)
            })
          }
        }

        if (channel instanceof TextChannel) {
          const embed = new EmbedBuilder({
            title: '🔄 **Mudança de IP**',
            description: `A alteração pode levar alguns minutos para entrar em vigor!\n\n⏳ **Horário da Mudança:** <t:${Math.floor(Date.now() / 1000)}:R>\n**IP Antigo:** ${oldIp} ➡️ **IP Novo:** ${newIp} 🌐`
          })

          for (const [zoneName, values] of Object.entries(records)) {
            embed.addFields({ name: zoneName, value: codeBlock(values.map((value) => value.name).join('\n')) })
          }

          await channel.send({ embeds: [embed] })
        }
      }
    }
  }
})
