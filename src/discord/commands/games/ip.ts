import { db } from '@/app'
import { Command } from '@/discord/base'
import { type Minecraft } from '@/interfaces/Minecraft'
import axios from 'axios'
import { ApplicationCommandType, AttachmentBuilder, codeBlock, EmbedBuilder } from 'discord.js'

interface ServerData {
  online: boolean
  ip: string
  port: number
  hostname?: string
  debug: {
    ping: boolean
    query: boolean
    srv: boolean
    querymismatch: boolean
    ipinsrv: boolean
    cnameinsrv: boolean
    animatedmotd: boolean
    cachehit: boolean
    cachetime: number
    cacheexpire: number
    apiversion: number
  }
  version: string
  protocol?: {
    version: number
    name?: string
  }
  icon?: string
  software?: string
  map: {
    raw: string
    clean: string
    html: string
  }
  gamemode?: string
  serverid?: string
  eula_blocked?: boolean
  motd: {
    raw: string[]
    clean: string[]
    html: string[]
  }
  players: {
    online: number
    max: number
    list?: Array<{
      name: string
      uuid: string
    }>
  }
  plugins?: Array<{
    name: string
    version: string
  }>
  mods?: Array<{
    name: string
    version: string
  }>
  info?: {
    raw: string[]
    clean: string[]
    html: string[]
  }
}

new Command({
  name: 'ip',
  description: '[ 🎮 Games ] Pegar ip do Minecraft',
  dmPermission,
  type: ApplicationCommandType.ChatInput,
  async run (interaction) {
    const { guildId, guild } = interaction
    const ip = await db.guilds.get(`${guildId}.config.minecraft`) as Minecraft

    if (ip?.ipBedrock === undefined && ip?.ipJava === undefined) {
      await interaction.reply({
        ephemeral,
        embeds: [new EmbedBuilder({
          title: '❌ Nenhum ip foi configurado!'
        })]
      })
      return
    }

    await interaction.deferReply()

    if (ip?.ipJava !== undefined) {
      const { online, icon, players } = (await axios.get(`https://api.mcsrvstat.us/3/${ip.ipJava}`)).data as ServerData
      const attachment: AttachmentBuilder[] = []

      if (icon !== undefined) attachment.push(new AttachmentBuilder(Buffer.from(icon, 'base64'), { name: 'image.png' }))

      const embed: EmbedBuilder = new EmbedBuilder({
        author: { name: 'Status do Servidor', iconURL: (icon !== undefined) ? 'attachment://image.png' : undefined },
        fields: [
          { name: '**🎮 Java:**', value: codeBlock(ip.ipJava ?? ''), inline },
          { name: '**💎 Players Conectados:**', value: codeBlock(`${players?.online ?? 0}/${players?.max ?? 0}`), inline },
          { name: '\u200E', value: '\u200E', inline }
        ],
        image: { url: `http://status.mclive.eu/${guild?.name ?? ip.ipJava}/${ip.ipJava}/${ip.ipJava.split(':')[1] ?? '25565'}/banner.png` }
      }).setColor(online ? 'Green' : 'Red')

      if (ip?.ipBedrock !== undefined) {
        embed.addFields({ name: '**🎮 Bedrock:**', value: codeBlock(ip.ipBedrock.split(':')[0]), inline })
        embed.addFields({ name: '**🚪 Porta:**', value: codeBlock(ip.ipBedrock.split(':')[1]), inline })
        embed.addFields({ name: '\u200E', value: '\u200E', inline })
      }

      embed.setFooter({ text: `Equipe ${guild?.name} | Todos os Direitos Reservados`, iconURL: (interaction?.guild?.iconURL({ size: 64 }) ?? undefined) })
      await interaction.editReply({ embeds: [embed], files: attachment })
    }
  }
})
