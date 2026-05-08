import TicketInterface from '@/database/entity/Ticket.entry.js'
import type { History } from '@/types/entities.js'
import { database } from '@/database'
import { ActionDrawer, DiscordError } from 'discord'
import { AttachmentBuilder, ButtonBuilder, ButtonStyle, ChannelType, codeBlock, ComponentType, EmbedBuilder, PermissionsBitField } from 'discord.js'
import { TicketBuilder } from './TicketBuilder.js'
import type { Interaction } from '@/types/interactions.js'

function formatTranscriptText(displayName: string, fields: Array<{ name: string, value: string }>, history: History[]): string {
  let text = `📄 Historico do ${displayName}\n\n`
  let fieldIndex = 0
  let dayCache: string | undefined

  for (const { name, value } of fields) {
    if (value === '‎' || name === '‎') continue
    const line = `${name} ${value.replace(/```/g, '')}`.replace(/(\r\n|\n|\r)/gm, '')
    text += line + (fieldIndex % 2 !== 0 ? '\n\n' : '\n')
    fieldIndex++
  }

  for (const message of history) {
    if (message === undefined) continue
    const date = new Date(message.date)
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')

    text += day !== dayCache ? `\n\n[${year}:${month}:${day}]\n\n` : ''
    if (message.role === 'bot') {
      text += `\n\n[${date.getHours()}:${date.getMinutes()}] ${message.message.content}\n\n`
    } else {
      text += `[${date.getHours()}:${date.getMinutes()}] [${message.role}]${message.deleted ? ' [DELETED] ' : ''} ${message.user.name}: ${message.message.content}\n`
    }
    dayCache = day
  }

  return text
}

export class Ticket {
  private readonly interaction
  constructor ({ interaction }: { interaction: Interaction }) {
    this.interaction = interaction
  }

  async delete ({ channelId }: { channelId: string }) {
    const { user } = this.interaction
    const messagePrimary = await this.interaction.editReply({
      embeds: [new EmbedBuilder({
        description: 'Tem certeza que deseja fechar o Ticket?'
      }).setColor('Orange')],
      components: ActionDrawer<ButtonBuilder>([
        new ButtonBuilder({ customId: 'embed-confirm-button', label: 'Confirmar', style: ButtonStyle.Success }),
        new ButtonBuilder({ customId: 'embed-cancel-button', label: 'Cancelar', style: ButtonStyle.Danger })
      ])
    })
    const collector = messagePrimary.createMessageComponentCollector({ componentType: ComponentType.Button })

    collector.on('collect', async (subInteraction) => {
      collector.stop()
      const clearData = { components: [], embeds: [] }

      if (subInteraction.customId === 'embed-cancel-button') {
        await subInteraction.update({
          ...clearData,
          embeds: [new EmbedBuilder({ title: 'Você cancelou a ação' }).setColor('Green')]
        })
      } else if (subInteraction.customId === 'embed-confirm-button') {
        const futureTime = new Date(Date.now() + 5000)
        const futureTimeString = `<t:${Math.floor(futureTime.getTime() / 1000)}:R>`
        const ticketBuilder = new TicketBuilder({ interaction: this.interaction })

        await subInteraction.update({
          ...clearData,
          embeds: [new EmbedBuilder({
            title: `👋 | Olá ${user.username}`,
            description: `❗️ | Esse ticket será excluído em ${futureTimeString} segundos.`
          }).setColor('Red')]
        })
        await new Promise<void>((resolve) => setTimeout(() => resolve(), 5000))
        await (await ticketBuilder.setTicket(channelId).loader()).delete()
      }
    })
  }

  async transcript (options: { messageId?: string, channelId?: string, reason?: string, observation?: string }): Promise<void> {
    const { guildId, guild } = this.interaction
    const { messageId, channelId, observation, reason } = options
    let ticket: TicketInterface | undefined

    if (messageId !== undefined) {
      const claimData = await database.claim.findOne({ where: { messageId }, relations: { ticket: true } })
      ticket = claimData?.ticket as TicketInterface
    } else if (channelId !== undefined) {
      const ticketData = await database.ticket.findOne({ where: { channelId } })
      ticket = ticketData as TicketInterface
    }
    if (ticket === undefined) return await new DiscordError({ element: 'Claim', interaction: this.interaction }).notFound({ type: 'Database' }).reply()
    const user = await (await this.interaction.client.guilds.fetch(guildId)).members.fetch(ticket.ownerId).catch(() => undefined)
    const config = await database.config.findOne({ where: { guild: { guildId } }, relations: { guild: true } })

    const createChannel = async () => {
      return await guild.channels.create({
        name: '🎫・ticket-logs',
        type: ChannelType.GuildText,
        permissionOverwrites: [{ id: guildId, deny: [PermissionsBitField.Flags.ViewChannel] }]
      })
    }

    // Usa loose equality para capturar tanto null quanto undefined em config.logsId
    const channel = config?.logsId != null
      ? (await guild.channels.fetch()).find((ch) => ch?.id === config!.logsId && ch?.type === ChannelType.GuildText) ?? await createChannel()
      : await createChannel()

    if (config !== null && config.logsId == null) await database.config.save(Object.assign(config, { logsId: channel.id }))

    const embed = new EmbedBuilder({
      title: '📄 Historico do ticket',
      fields: [
        { name: '🧑🏻‍💻 Usuário:', value: codeBlock(user?.displayName ?? 'Saiu do servidor...'), inline: true },
        { name: '🪪 ID:', value: codeBlock(ticket.ownerId), inline: true },
        { name: '‎', value: '‎', inline: true },

        { name: '🤝 Claim:', value: codeBlock(ticket.team.length > 0 ? ticket.team.map((teamUser) => teamUser.displayName).join(', ') : 'Ninguém reivindicou o ticket'), inline: true },
        { name: '🪪 ID:', value: codeBlock(ticket.team.length > 0 ? ticket.team.map((teamUser) => teamUser.id).join(', ') : 'None'), inline: true },
        { name: '‎', value: '‎', inline: true },

        { name: '❓ Motivo:', value: codeBlock(ticket.category.title), inline: true },
        { name: '📃 Descrição:', value: codeBlock(ticket?.description ?? 'Desconhecido'), inline: true },
        { name: '‎', value: '‎', inline: true },

        { name: '🔎 Ticket ID:', value: codeBlock(String(ticket.id)), inline: true },
        { name: '🤝 Convidados:', value: codeBlock(ticket.users.length === 0 ? 'Não houve convidados!' : ticket.users?.map((ticketUser) => `\n\nUser: ${ticketUser.displayName} \nId: ${ticketUser.id}`)?.join(', ')), inline: true },
        { name: '‎', value: '‎', inline: true }
      ]
    }).setColor(user?.roles.color?.hexColor ?? 'Green')

    if (typeof observation === 'string') embed.addFields({ name: '📝 Observação', value: codeBlock(observation) })
    if (typeof reason === 'string') embed.addFields({ name: '👉 Motivo do atendimento', value: codeBlock(reason) })

    const text = formatTranscriptText(user?.displayName ?? ticket.ownerId, embed.data.fields ?? [], ticket.history ?? [])

    if (!channel.isTextBased()) return await new DiscordError({ element: `pois o channel: ${channel.name}, não tem a permissão de envio de mensagens.`, interaction: this.interaction }).notPossible().reply()
    await channel.send({ embeds: [embed] })
    await channel.send({ files: [
      new AttachmentBuilder(Buffer.from(text), { name: `${ticket.ownerId}.log`, description: `Transcript do usuário ${user?.displayName ?? ticket.ownerId}` })
    ] })
    if (this.interaction.deferred) await this.interaction.editReply({
      embeds: [new EmbedBuilder({ title: '✅ Logs salvas com sucesso' }).setColor('Green')]
    }).catch(() => undefined)
  }
}
