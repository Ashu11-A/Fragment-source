import { Database } from '@/controller/database'
import { Event } from '@/discord/base'
import Config from '@/entity/Config.entry'
import { EmbedBuilder } from 'discord.js'

new Event({
  name: 'guildMemberAdd',
  async run (interaction) {
    console.log(`Um novo usuário entrou no servidor: | ${interaction.guild.name} | ${interaction.user.username}`)
    try {
      const { guild, user } = interaction
      const config = await new Database<Config>({ table: 'Config' }).findOne({ where: { guild: { guildId: guild.id } }, relations: { guild: true } })
      // const enabled = await db.system.get(`${interaction.guild?.id}.status.systemWelcomer`)
      // if (enabled !== undefined && enabled === false) return
      // const suportDB = await db.guilds.get(`${interaction?.guild?.id}.ticket.channel`) as string
      // const ticketChannel = interaction.guild?.channels.cache.get(suportDB)
      if (config?.logEntry === undefined) return

      const sendChannel = await interaction.guild?.channels.fetch(config.logEntry) 
      if (sendChannel?.isTextBased() !== true) return

      const userImage = interaction.user?.avatarURL({ size: 512 })
      const embed = new EmbedBuilder({
        title: `${user.username} | Bem-vindo(a)!`,
        description: `🥰 Olá, seja bem-vindo(a) a ${interaction.guild.name}!`,
        fields: [
          {
            name: '👋 Sabia que...',
            value: `Você é o ${interaction.guild.memberCount}º membro aqui no servidor?`,
            inline: true
          },
          {
            name: '🛡 Tag do Usuário',
            value: '``' + interaction.user.username + '``' + `(${interaction.user.id})`,
            inline: true
          },
        ],
        footer: { text: `Equipe ${interaction.guild?.name}`, icon_url: (interaction?.guild?.iconURL({ size: 64 }) ?? undefined) },
        thumbnail: userImage !== null ? { url: userImage } : undefined
      }).setColor('Green')

      await sendChannel?.send({ embeds: [embed] })
    } catch (err) {
      console.log(err)
    }
  }
})
