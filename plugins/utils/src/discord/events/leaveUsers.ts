import { Database } from '@/controller/database.js'
import { Event } from '@/discord/base/index.js'
import Config from '@/entity/Config.entry.js'
import { EmbedBuilder } from 'discord.js'

new Event({
  name: 'guildMemberRemove',
  async run (interaction) {
    console.log(`Um usuário saiu do servidor: | ${interaction.guild.name} | ${interaction.user.username}`)
    try {
      const { guild, user } = interaction
      const config = await new Database<Config>({ table: 'Config' }).findOne({ where: { guild: { guildId: guild.id } }, relations: { guild: true } })
      // const enabled = await db.system.get(`${interaction.guild?.id}.status.systemWelcomer`)
      // if (enabled !== undefined && enabled === false) return

      // const channelStaffDB = await db.guilds.get(`${interaction?.guild?.id}.channel.staff_logs`) as string
      // const sendStaffChannel = interaction?.guild.channels.cache.get(channelStaffDB) as TextChannel | undefined

      //const userStaff = await db.staff.get(`${interaction.guild.id}.members.${interaction.user.id}`)

      // if (userStaff !== undefined) {
      //   console.log('membro da equipe encontado, removendo...')
      //   const embed = new EmbedBuilder()
      //     .setColor('Red')
      //     .setTitle('📰 | STAFF LOG')
      //     .setDescription(
      //       `<@${interaction.user.id}> não integra mais a equipe.`
      //     )
      //     .setFooter({ text: `Equipe ${interaction.guild?.name}` })
      //     .setTimestamp()

      //   if (sendStaffChannel !== undefined) {
      //     await sendStaffChannel.send({ embeds: [embed] })
      //   }
      //   await db.staff.delete(`${interaction.guild.id}.members.staff.${interaction.user.id}`)
      // }

      if (config?.logExit === undefined) return

      const sendChannel = interaction.guild?.channels.cache.get(config.logExit)
      if (sendChannel?.isTextBased() !== true) return

      const embed = new EmbedBuilder({
        description: `Usuário ${user.username}, saiu do servidor!`,
        // footer: { text: `Equipe ${interaction.guild?.name}`, iconURL: (interaction.guild.iconURL({ size: 64 }) ?? undefined) }
      }).setColor('Random')
    
      await sendChannel?.send({ embeds: [embed] })
    } catch (err) {
      console.log(err)
    }
  }
})
