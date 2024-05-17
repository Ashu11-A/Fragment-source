import { console } from "@/controller/console";
import { Database } from "@/controller/database";
import { Config } from "@/discord/base/Config";
import ConfigTable from "@/entity/Config.entry";
import { ApplicationCommandOptionType, ChannelType, EmbedBuilder, TextChannel } from "discord.js";

new Config({
  name: 'guild',
  description: '[ 🗂 Servidor ] Configurar elementos do servidor',
  type: ApplicationCommandOptionType.Subcommand,
  options: [
    {
      name: 'ban-kick',
      description: '[ 🚫 Bans ] Canal onde ficará os avisos de banimentos de usuários.',
      type: ApplicationCommandOptionType.Channel,
      channelTypes: [ChannelType.GuildText]
    },
    {
      name: 'entrada',
      description: '[ 🛬 Entrada Users ] Canal onde ficará os avisos de entrada de novos usuários.',
      type: ApplicationCommandOptionType.Channel,
      channelTypes: [ChannelType.GuildText]
    },
    {
      name: 'logs-equipe',
      description: '[ 📃 Logs ] Use para definir o canal de logs.',
      type: ApplicationCommandOptionType.Channel,
      channelTypes: [ChannelType.GuildText]
    },
    {
      name: 'logs-geral',
      description: '[ 📃 Logs ] Use para definir o canal de logs.',
      type: ApplicationCommandOptionType.Channel,
      channelTypes: [ChannelType.GuildText]
    },
    {
      name: 'saída',
      description: '[ 🛫 Saída Users ] Canal onde ficará os avisos de saídas dos usuários.',
      type: ApplicationCommandOptionType.Channel,
      channelTypes: [ChannelType.GuildText]
    }
  ],
  async run(interaction) {
    const { options: dcOptions, guildId } = interaction
    if (guildId === null) return
    await interaction.deferReply({ ephemeral: true })
    eval
    const banKick = dcOptions.getChannel('ban-kick') as TextChannel | null
    const entrada = dcOptions.getChannel('entrada') as TextChannel | null
    const logsEquipe = dcOptions.getChannel('logs-equipe') as TextChannel | null
    const logsGeral = dcOptions.getChannel('logs-geral') as TextChannel | null
    const saída = dcOptions.getChannel('saída') as TextChannel | null

    /* Database settings */
    const config = new Database<ConfigTable>({ table: 'Config' })
    const dataDB = await config.findOne({ where : { guild: { id: guildId } }})
    let data = dataDB ?? {}
    const text = []

    if (banKick !== null) {
      data = { ...data, logBanKick: banKick.id }
      text.push(`${banKick.name} setado para o banimento ou a expulsão de usuários!`)
    }

    if (entrada !== null) {
      data = { ...data, logEntry: entrada.id }
      text.push(`${entrada.name} setado para a entrada de novos usuários!`)
    }

    if (logsEquipe !== null) {
      data = { ...data, logStaff: logsEquipe.id }
      text.push(`${logsEquipe?.name} setado para as logs de entrada e saída da equipe!`)
    }

    if (logsGeral !== null) {   
      data = { ...data, logs: logsGeral.id }
      text.push(`${logsGeral?.name} setado para os logs!`)
    }

    if (saída !== null) {
      data = { ...data, logExit: saída.id }
      text.push(`${saída?.name} setado para a saída de usuários!`)
    }
    
    if (text.length === 0) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder({
            title: '⚠️ Nenhuma alteração foi realizada'
          }).setColor('Orange')
        ]
      })
      return
    }

    if (dataDB !== null) {
      await config.save(data)
    } else {
      await config.create(data)
    }

    await interaction.editReply({
      embeds: [new EmbedBuilder({
        title: '📑 Configurações salvas com sucesso!',
        description: text.join('\n')
      })]
    })
    
    console.log(data)
  }
})
