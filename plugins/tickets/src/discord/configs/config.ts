import { Template } from "@/class/Template.js";
import { configDB } from "@/functions/database.js";
import { ApplicationCommandOptionChoiceData, ApplicationCommandOptionType, ChannelType, EmbedBuilder } from "discord.js";
import { Config } from "../base/Config.js";

new Config({
  name: 'ticket',
  description: '[ 🎫 Ticket ] Configurar o sistema de Tickets',
  type: ApplicationCommandOptionType.Subcommand,
  options: [
    {
      name: 'panel-embed',
      description: '[ 🎫 Ticket ] Envia a embed de configuração.',
      required: false,
      type: ApplicationCommandOptionType.Channel,
      channelTypes: [ChannelType.GuildText]
    },
    {
      name: 'limit',
      description: '[ 🎫 Ticket ] Limita a quantidade tickets por 24h.',
      required: false,
      type: ApplicationCommandOptionType.Number
    },
    {
      name: 'claim-channel',
      description: '[ 🎫 Ticket ] Chat onde seram enviadas os pedidos de ticket.',
      type: ApplicationCommandOptionType.Channel,
      channelTypes: [ChannelType.GuildText],
      required: false
    },
    {
      name: 'claim-limit',
      description: '[ 🎫 Ticket ] Limita a quantidade de tickets que pode se revindicar',
      type: ApplicationCommandOptionType.Number,
      minValue: 1,
      maxValue: 999,
      required: false
    },
    {
      name: 'logs-channel',
      description: '[ 🎫 Ticket ] Chat onde seram enviadas as logs dos tickets.',
      type: ApplicationCommandOptionType.Channel,
      channelTypes: [ChannelType.GuildText]
    },
    {
      name: 'add-role-team',
      required: false,
      description: '[ 🎫 Ticket ] Adicionar cargos do suporte.',
      type: ApplicationCommandOptionType.Role
    },
    {
      name: 'rem-role-team',
      description: '[ 🎫 Ticket ] Remover cargos',
      type: ApplicationCommandOptionType.String,
      required: false,
      autocomplete: true
    }
  ],
  async autoComplete (interaction) {
    const { options, guildId } = interaction
    if (guildId === null) return
    const respond: Array<ApplicationCommandOptionChoiceData<string | number>> = []
    let haveInteraction = false

    console.log(options.getSubcommand(), options.getFocused(true))

    switch (options.getSubcommand()) {
    case 'ticket': {
      switch (options.getFocused(true).name) {
      case 'rem-role-team': {
        haveInteraction = true
        const roles = (await configDB.findOne({ where: { guild: { guildId } }}))?.roles ?? []
        if (roles.length > 0) {
          for (const role of roles) {
            respond.push({ name: `${role.name} | ${role.id}`, value: role.id })
          }
        }
        break
      }
      }
    }
    }
    console.log(respond)
    if (haveInteraction) await interaction.respond(respond)
  },
  async run(interaction) {
    const { options, guildId, guild } = interaction
    if (guildId === null || guild == null) return
    await interaction.deferReply({ ephemeral: true })
    const channel = options.getChannel('panel-embed')
    const limit = options.getNumber('limit')
    const claimChannel = options.getChannel('claim-channel')
    const claimLimit = options.getNumber('claim-limit')
    const logs = options.getChannel('logs-channel')
    const addRole = options.getRole('add-role-team')
    const remRole = options.getString('rem-role-team')
    const template = new Template({ interaction })

    const dataDB = await configDB.findOne({ where: { guild: { guildId } }})
    let data = dataDB ?? {} as Record<string, any>
    const text = []

    if (claimLimit !== null) {
      data = Object.assign(data, { claimLimit })
      text.push(`Limite de claim definido para ${claimLimit}`)
    }

    if (addRole !== null) {
      const roles = data.roles ?? []

      if (roles.some((role: { id: string; }) => role.id === addRole.id)) {
        await interaction.editReply({
          embeds: [new EmbedBuilder({
            title: '❌ Esse cargo já está na lista!'
          }).setColor('Red')]
        })
        return
      }

      const newRoles = [ ...roles, { name: addRole.name, id: addRole.id } ]

      data = Object.assign(data, { roles: newRoles })
      text.push(`${addRole.name} definido para interações com os tickets`)
    }

    if (remRole !== null) {
      const roles = data.roles ?? []
      const removedRole = roles.filter((role: { id: string; }) => role.id !== remRole)

      data = Object.assign(data, { roles: removedRole })
      text.push(`Cargo ${remRole} removido dos tickets`)
    }

    if (channel !== null) {
      const sendChannel = await guild.channels.fetch(channel.id)
      if (typeof sendChannel?.id !== 'string' || sendChannel?.isTextBased() !== true) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder({
              title: 'O channel definido em panel-embed não é valido!'
            }).setColor ('Red')
          ]
        })
        return
      }

      if (sendChannel !== undefined) template.create({
        title: 'Pedir suporte',
        description: 'Se você estiver precisando de ajuda clique no botão abaixo',
        channelId: sendChannel.id,
        guildId
      })
    }
    if (limit !== null) {
      data = Object.assign(data, { limit })
      text.push(`Limite de tickets por pessoa agora é de ${limit}!`)
    }
    if (claimChannel !== null) {
      data = Object.assign(data, { claimId: claimChannel.id })
      text.push(`Channel para os pedidos de claim definido para: ${claimChannel.name}!`)
    }
    if (logs !== null) {
      data = Object.assign(data, { logsId: logs.id })
      text.push(`Channel para os envios de logs definido para: ${logs.name}!`)
    }
    try {
      if (dataDB !== null) {
        await configDB.update({ id: dataDB.id }, data)
      } else {
        await configDB.save(await configDB.create(Object.assign(data, { guild: { guildId } })))
      }

      await interaction.editReply({
        embeds: [
          new EmbedBuilder({
            title: 'Informações salvas com sucesso no banco de dados!',
            description: text.join('\n')
          }).setColor('Green')
        ]
      })
      setTimeout(() => interaction.deleteReply(), 10000)
    } catch (err) {
      await interaction.editReply({
        embeds: [new EmbedBuilder({
          title: 'Database não respondeu de forma correta!'
        }).setColor('Red')]
      })
    }
  },
})