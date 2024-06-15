import { Error } from "@/discord/base/CustomResponse.js"
import { claimDB, configDB, ticketDB } from "@/functions/database.js"
import { AttachmentBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChannelType, codeBlock, CommandInteraction, ComponentType, EmbedBuilder, ModalSubmitInteraction, PermissionsBitField, StringSelectMenuInteraction, TextBasedChannel } from "discord.js"
import TicketInterface from '@/entity/Ticket.entry.js'
import { TicketBuilder } from "./TicketBuilder.js"
import { ActionDrawer } from "@/functions/actionDrawer.js"

type Interaction = CommandInteraction<'cached'> | ModalSubmitInteraction<'cached'> | ButtonInteraction<'cached'> | StringSelectMenuInteraction<'cached'>
  
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
          embeds: [
            new EmbedBuilder({
              title: 'Você cancelou a ação'
            }).setColor('Green')
          ]
        })
      } else if (subInteraction.customId === 'embed-confirm-button') {
        const now = new Date()
        const futureTime = new Date(now.getTime() + 5000)
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
      const claimData = await claimDB.findOne({ where: { messageId }, relations: { ticket: true } })
      ticket = claimData?.ticket as TicketInterface
    } else if (channelId !== undefined) {
      const ticketData = await ticketDB.findOne({ where: { channelId } })
      ticket  = ticketData as TicketInterface
    }
    if (ticket === undefined) return await new Error({ element: 'Claim', interaction: this.interaction }).notFound({ type: 'Database' }).reply()
    const user = await (await this.interaction.client.guilds.fetch(guildId)).members.fetch(ticket.ownerId).catch(() => undefined)
    const config = await configDB.findOne({ where: { guild: { guildId } }, relations: { guild: true } })


    const createChannel = async () => {
      return await guild.channels.create({
        name: '🎫・ticket-logs',
        type: ChannelType.GuildText,
        permissionOverwrites: [ { id: guildId, deny: [PermissionsBitField.Flags.ViewChannel] } ]
      })
    }
    const channel = config?.logsId !== null
      ? (await guild.channels.fetch()).find((channel) => channel?.id === config?.logsId && channel?.type === ChannelType.GuildText) as TextBasedChannel ?? await createChannel()
      : await createChannel()
    
    if (config?.logsId === null) await configDB.save(Object.assign(config ?? {}, { logsId: channel.id }))

    const embed = new EmbedBuilder({
      title: '📄 Historico do ticket',
      fields: [
        { name: '🧑🏻‍💻 Usuário:', value: codeBlock(user?.displayName ?? 'Saiu do servidor...'), inline: true },
        { name: '🪪 ID:', value: codeBlock(ticket.ownerId), inline: true },
        { name: '\u200E', value: '\u200E', inline: true },
  
        { name: '🤝 Claim:', value: codeBlock(ticket.team.length > 0 ? ticket.team.map((user) => user.displayName).join(', ') : 'Ninguém reivindicou o ticket'), inline: true },
        { name: '🪪 ID:', value: codeBlock(ticket.team.length > 0 ? ticket.team.map((user) => user.id).join(', ') : 'None'), inline: true },
        { name: '\u200E', value: '\u200E', inline: true },
  
        { name: '❓ Motivo:', value: codeBlock(ticket.category.title), inline: true },
        { name: '📃 Descrição:', value: codeBlock(ticket?.description ?? 'Desconhecido'), inline: true },
        { name: '\u200E', value: '\u200E', inline: true },
  
        { name: '🔎 Ticket ID:', value: codeBlock(String(ticket.id)), inline: true },
        { name: '🤝 Convidados:', value: codeBlock(ticket.users.length === 0 ? 'Não houve convidados!' : ticket.users?.map((user) => `\n\nUser: ${user.displayName} \nId: ${user.id}`)?.join(', ')), inline: true },
        { name: '\u200E', value: '\u200E', inline: true }
      ]
    }).setColor(user?.roles.color?.hexColor ?? 'Green')

    if (typeof observation === 'string') embed.addFields({ name: '📝 Observação', value: codeBlock(observation) })
    if (typeof reason === 'string') embed.addFields({ name: '👉 Motivo do atendimento', value: codeBlock(reason) })

    let text = `📄 Historico do ${user?.displayName}\n\n`
    let dayCache: string | undefined
    let elements = 0

    for (const { name, value } of (embed.data.fields ?? [])) {
      if (value === '\u200E' || name === '\u200E') continue
      text += ((`${name} ${value.replace(/```/g, '')}`.replace(/(\r\n|\n|\r)/gm, '')) + (((elements % 2) !== 0) ? '\n\n' : '\n'))
      elements++
    }

    for (const message of (ticket.history ?? [])) {
      if (message === undefined) continue
      const data = new Date(message.date)
      const ano = data.getFullYear()
      const mes = (data.getMonth() + 1).toString().padStart(2, '0') // adiciona zero à esquerda, se necessário
      const dia = data.getDate().toString().padStart(2, '0')

      text += dia !== dayCache ? `\n\n[${ano}:${mes}:${dia}]\n\n` : ''
      if (message.role === 'bot') {
        text += `\n\n[${data.getHours()}:${data.getMinutes()}] ${message.message.content}\n\n`
      } else {
        text += `[${data.getHours()}:${data.getMinutes()}] [${message.role}]${message.deleted ? ' [DELETED] ' : ''} ${message.user.name}: ${message.message.content}\n`
      }

      dayCache = dia
    }

    await channel.send({ embeds: [embed] })
    await channel.send({ files: [
      new AttachmentBuilder(Buffer.from(text), { name: `${ticket.ownerId}.log`, description: `Transcript do usuário ${user?.displayName ?? ticket.ownerId}` })
    ] })
    if (this.interaction.deferred) await this.interaction.editReply({
      embeds: [new EmbedBuilder({
        title: '✅ Logs salvas com sucesso'
      }).setColor('Green')]
    }).catch(() => undefined)
  }
}