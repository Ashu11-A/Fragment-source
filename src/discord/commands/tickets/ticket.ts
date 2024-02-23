import { EmbedBuilder, ApplicationCommandOptionType, ApplicationCommandType, type TextChannel } from 'discord.js'
import { Command } from '@/discord/base'
import { db } from '@/app'
import { TicketButtons, ticketButtonsConfig } from '@/discord/components/tickets'
import { Database, Discord } from '@/functions'

new Command({
  name: 'ticket',
  description: '[ 🎫 Ticket ] Abrir Ticket',
  type: ApplicationCommandType.ChatInput,
  dmPermission,
  options: [
    {
      name: 'panel-embed',
      description: '[ADM] Envia a embed de configuração.',
      required: false,
      type: ApplicationCommandOptionType.Channel
    },
    {
      name: 'limit',
      description: '[ADM] Limita a quantidade tickets por 24h.',
      required: false,
      type: ApplicationCommandOptionType.Number
    }
  ],
  async run (interaction) {
    const { guild, guildId, channelId, options } = interaction
    const channel = options.getChannel('panel-embed')
    const limit = options.getNumber('limit')
    const sendChannel = guild?.channels.cache.get(String(channel?.id)) as TextChannel

    await interaction.deferReply({ ephemeral: true })
    const ticketConstructor = new TicketButtons({ interaction })

    if (typeof limit === 'number') {
      await new Database({
        interaction,
        pathDB: 'config.ticketsLimit',
        typeDB: 'guilds'
      }).set({
        data: limit
      })
      return
    }
    if (channel === null) {
      await ticketConstructor.createTicket({ about: 'Ticket aberto por meio do comando /ticket' })
      return
    }

    if (await Discord.Permission(interaction, 'Administrator')) return

    try {
      const embed = new EmbedBuilder()
        .setTitle('Pedir suporte')
        .setDescription('Como Abrir um Ticket:\nPor favor, escolha o tipo de ticket que você deseja abrir.')
        .setFooter({ text: `Equipe ${interaction.guild?.name}`, iconURL: (interaction?.guild?.iconURL({ size: 64 }) ?? undefined) })
        .setColor('Green')
        .setThumbnail(null)
        .setImage(null)

      if (sendChannel !== undefined) {
        await sendChannel.send({ embeds: [embed] })
          .then(async (msg) => {
            await db.messages.set(`${guildId}.ticket.${channelId}.messages.${msg.id}`, {
              id: msg.id,
              embed: embed.toJSON()
            })
            await ticketButtonsConfig(interaction, msg)
            await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setDescription(`✅ | Mensagem enviada com sucesso ao chat: <#${sendChannel.id}>`)
                  .setColor('Green')
              ],
              components: [
                await Discord.buttonRedirect({
                  guildId,
                  channelId: sendChannel.id,
                  emoji: { name: '🗨️' },
                  label: 'Ir ao canal'
                })
              ]
            })
          })
      }
    } catch (error) {
      console.error(error)
      return await interaction.editReply({
        content: 'Ocorreu um erro!'
      })
    }
  }
})
