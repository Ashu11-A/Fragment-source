import { createDatabase } from '@/utils/database'
import type { PluginContext } from 'discord'
import { type ApplicationCommandOptionChoiceData, ApplicationCommandOptionType, ChannelType, EmbedBuilder, MessageFlags } from 'discord.js'

export default function register(ctx: PluginContext): void {
  const database = createDatabase(ctx)

  ctx.config({
    name: 'ticket',
    description: '[ 🎫 Ticket ] Configurar o sistema de Tickets',
    type: ApplicationCommandOptionType.Subcommand,
    options: [
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
    async autoComplete(interaction) {
      const { options, guildId } = interaction
      if (guildId === null) return
      const respond: Array<ApplicationCommandOptionChoiceData<string | number>> = []
      let haveInteraction = false

      switch (options.getSubcommand()) {
      case 'ticket': {
        switch (options.getFocused(true).name) {
        case 'rem-role-team': {
          haveInteraction = true
          const roles = (await database.config.findOne({ where: { guild: { guildId } } }))?.roles ?? []
          for (const role of roles) {
            respond.push({ name: `${role.name} | ${role.id}`, value: role.id })
          }
          break
        }
        }
      }
      }
      if (haveInteraction) await interaction.respond(respond)
    },
    async run(interaction) {
      const { options, guildId, guild } = interaction
      if (guildId === null || guild == null) return
      await interaction.deferReply({ flags: MessageFlags.Ephemeral })
      const limit = options.getNumber('limit')
      const claimChannel = options.getChannel('claim-channel')
      const claimLimit = options.getNumber('claim-limit')
      const logs = options.getChannel('logs-channel')
      const addRole = options.getRole('add-role-team')
      const remRole = options.getString('rem-role-team')

      const dataDB = await database.config.findOne({ where: { guild: { guildId } } })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data = dataDB ?? {} as Record<string, any>
      const text: string[] = []

      if (claimLimit !== null) {
        data = Object.assign(data, { claimLimit })
        text.push(`Limite de claim definido para ${claimLimit}`)
      }
      if (addRole !== null) {
        const roles = data.roles ?? []
        if (roles.some((role: { id: string }) => role.id === addRole.id)) {
          await interaction.editReply({ embeds: [new EmbedBuilder({ title: '❌ Esse cargo já está na lista!' }).setColor('Red')] })
          return
        }
        data = Object.assign(data, { roles: [...roles, { name: addRole.name, id: addRole.id }] })
        text.push(`${addRole.name} definido para interações com os tickets`)
      }
      if (remRole !== null) {
        const roles = data.roles ?? []
        data = Object.assign(data, { roles: roles.filter((role: { id: string }) => role.id !== remRole) })
        text.push(`Cargo ${remRole} removido dos tickets`)
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
          await database.config.update({ id: dataDB.id }, data)
        } else {
          await database.config.save(await database.config.create(Object.assign(data, { guild: { guildId } })))
        }
        await interaction.editReply({
          embeds: [new EmbedBuilder({ title: 'Informações salvas com sucesso no banco de dados!', description: text.join('\n') }).setColor('Green')]
        })
        setTimeout(() => interaction.deleteReply(), 10000)
      } catch {
        await interaction.editReply({ embeds: [new EmbedBuilder({ title: 'Database não respondeu de forma correta!' }).setColor('Red')] })
      }
    },
  })
}
