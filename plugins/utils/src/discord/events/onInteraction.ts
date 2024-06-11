import { Database } from '@/controller/database.js'
import { Event } from '@/discord/base/index.js'
import Config from '@/entity/Config.entry.js'
import { EmbedBuilder, time } from 'discord.js'

new Event({
  name: 'interactionCreate',
  async run (interaction) {
    if (!interaction.inCachedGuild()) return

    if (interaction.isCommand()) {
      try {
        const { channel, user, commandName, createdAt, commandType, guild } = interaction
        // const enabled = await db.system.get(`${interaction.guild?.id}.status.systemLogs`)
        // if (enabled !== undefined && enabled === false) return

        // const logsDB = await db.guilds.get(`${interaction?.guild?.id}.channel.logs`) as string
        const config = await new Database<Config>({ table: 'Config' }).findOne({ where: { guild: { guildId: guild.id } }, relations: { guild: true } })

        if (config?.logs === undefined) return

        const sendChannel = await interaction.guild?.channels.fetch(config.logs)
        if (sendChannel?.isTextBased() !== true) return
 
        const emojis = ['⌨️', '👤', '✉️']
        const text = [
          'Executou o comando:',
          'Usou o context de usuário:',
          'Usou o context de mensagem:'
        ]
        const embed = new EmbedBuilder()
          .setTitle(`Usuário ${user.username}`)
          .addFields(
            {
              name: `**⚙️ ${text[commandType - 1]}**`,
              value: ` \`${commandName}\` `,
              inline: false
            },
            {
              name: `**${emojis[commandType - 1]} há:**`,
              value: `${time(createdAt, 'R')}`,
              inline: false
            },
            {
              name: '**🆔:**',
              value: `${user.id}`,
              inline: false
            }
          )
          .setColor('White')

        if (channel != null) embed.addFields({ name: '💬 No chat:', value: channel.url, inline: false })
        await sendChannel.send({ embeds: [embed] })
      } catch (err) {
        console.log(err)
      }
    }
  }
})
