import { ClaimBuilder } from '@/class/ClaimBuilder.js'
import { Ticket } from '@/class/Ticket.js'
import { TicketBuilder } from '@/class/TicketBuilder.js'
import { TicketPanel } from '@/class/TicketPanel.js'
import { database } from '@/database'
import type TicketInterface from '@/database/entity/Ticket.entry.js'
import { ActionDrawer, Button, DiscordError, Modal, ModalBuilder, StringSelect } from 'discord'
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  MessageFlags,
  type SelectMenuComponentOptionData,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js'

// ─── Switch (abre/fecha ticket) ──────────────────────────────────────────────


export const Switch = new Button({
  parser: 'Switch',
  async onClick (interaction) {
    const { channelId, user, message } = interaction
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    let ticketData: TicketInterface | null
    let claimId: string | undefined
    let ephemeral = false

    ticketData = await database.ticket.findOne({ where: { channelId }, relations: { claim: true } })
    if (ticketData === null) {
      ephemeral = true
      const claimData = await database.claim.findOne({ where: { messageId: message.id }, relations: { ticket: true } })
      ticketData = claimData?.ticket ?? null
      claimId = claimData?.messageId
    } else {
      claimId = ticketData.claim?.messageId
    }

    if (ticketData === null) return await new DiscordError({ element: `o ticket ${channelId}`, interaction }).notFound({ type: 'Database' }).reply()
    if (claimId === undefined) return await new DiscordError({ element: 'claim', interaction }).notFound({ type: 'Database' }).reply()

    const isClosed = !ticketData.closed
    const embed = new EmbedBuilder({
      title: isClosed ? '🔒 Ticket fechado!' : '🔓 Ticket aberto!',
      footer: { text: `Por: ${user.displayName} | Id: ${user.id}`, iconURL: user.avatarURL() ?? undefined }
    }).setColor(isClosed ? 'Red' : 'Green')

    const ticket = await (await new TicketBuilder({ interaction })
      .setData(ticketData)
      .setClosed(!ticketData.closed)
      .addEvent({ user: { id: user.id, name: user.displayName }, message: `Usuário ${user.displayName}(${user.id}), fechou o ticket!`, date: new Date() })
      .update())?.send([embed])

    await new ClaimBuilder({ interaction }).setData(ticket?.options as TicketInterface).edit({ messageId: claimId })

    if (ephemeral) { interaction.editReply({ embeds: [embed] }); return }
    await interaction.deleteReply()
  },
})

// ─── Close (confirmação antes de fechar) ─────────────────────────────────────

export const Close = new Button({
  parser: 'Close',
  async onClick (interaction) {
    const { user, channelId } = interaction
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    const messagePrimary = await interaction.editReply({
      embeds: [new EmbedBuilder({ description: 'Tem certeza que deseja fechar o Ticket?' }).setColor('Orange')],
      components: ActionDrawer<ButtonBuilder>([
        new ButtonBuilder({ customId: 'embed-confirm-button', label: 'Confirmar', style: ButtonStyle.Success }),
        new ButtonBuilder({ customId: 'embed-cancel-button', label: 'Cancelar', style: ButtonStyle.Danger })
      ])
    })

    const collector = messagePrimary.createMessageComponentCollector({ componentType: ComponentType.Button })
    collector.on('collect', async (sub) => {
      collector.stop()
      const clear = { components: [], embeds: [] }
      if (sub.customId === 'embed-cancel-button') {
        await sub.update({ ...clear, embeds: [new EmbedBuilder({ title: 'Você cancelou a ação' }).setColor('Green')] })
        return
      }
      const futureTimeString = `<t:${Math.floor((Date.now() + 5000) / 1000)}:R>`
      await sub.update({ ...clear, embeds: [new EmbedBuilder({ title: `👋 | Olá ${user.username}`, description: `❗️ | Esse ticket será excluído em ${futureTimeString} segundos.` }).setColor('Red')] })
      await new Promise<void>((resolve) => setTimeout(resolve, 5000))
      await (await new TicketBuilder({ interaction }).setTicket(channelId).loader()).delete()
    })
  },
})

// ─── CloseWithQuestion (abre modal de conclusão) ──────────────────────────────

export const CloseWithQuestion = new Button({
  parser: 'Close-With-Question',
  async onClick (interaction) {
    const modal = new ModalBuilder({ customId: 'Close-Question-Submit', title: 'Conclução do atendimento' })
    modal.setComponents(ActionDrawer<TextInputBuilder>([
      new TextInputBuilder({ customId: 'observation', label: 'Observação?', required: true, maxLength: 255, style: TextInputStyle.Paragraph, placeholder: 'O player de boa-fé entregou o item...' }),
      new TextInputBuilder({ customId: 'reason', label: 'Motivo do atendimento?', required: true, maxLength: 255, style: TextInputStyle.Paragraph, placeholder: 'O player abriu ticket para informar que...' })
    ], 1))
    await interaction.showModal(modal)
  },
})

// ─── CloseQuestionSubmit (processa modal de conclusão) ───────────────────────

export const CloseQuestionSubmit = new Modal({
  parser: 'Close-Question-Submit',
  async onSubmit (interaction) {
    const { channelId, fields } = interaction
    if (channelId === null) return
    const observation = fields.getTextInputValue('observation')
    const reason = fields.getTextInputValue('reason')
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    await (await new TicketBuilder({ interaction }).setTicket(channelId).loader()).delete({ observation, reason })
  },
})

// ─── Panel (abre select do painel) ───────────────────────────────────────────

export const Panel = new Button({
  parser: 'Panel',
  async onClick (interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    const options: SelectMenuComponentOptionData[] = [
      { emoji: { name: '🔊' }, label: 'Criar call', value: 'CreateCall' },
      { emoji: { name: '👤' }, label: 'Adicionar usuário', value: 'AddUser' },
      { emoji: { name: '🗑️' }, label: 'Remover usuário', value: 'RemoveUser' },
      { emoji: { name: '💾' }, label: 'Salvar logs', value: 'Transcript' },
    ]
    if (interaction.memberPermissions?.has('Administrator')) {
      options.push({ emoji: { name: '🗑️' }, label: 'Deletar ticket', value: 'Delete' })
    }

    await interaction.editReply({
      embeds: [new EmbedBuilder({ description: '👇 | Escolha uma das opções abaixo:', footer: { text: 'Todas essas opções existem em slashcommands!' } }).setColor('Green')],
      components: [new ActionRowBuilder<StringSelectMenuBuilder>({
        components: [new StringSelectMenuBuilder({ placeholder: 'Escolha uma opção!', customId: 'PanelSelect', options })]
      })]
    })
  },
})

// ─── PanelSelect (roteador das ações do painel) ───────────────────────────────

export const PanelSelect = new StringSelect({
  parser: 'PanelSelect',
  async onSelect (interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    const { values, channelId } = interaction
    const panel = new TicketPanel({ interaction })
    const ticket = new Ticket({ interaction })

    switch (values[0]) {
    case 'CreateCall':  await panel.CreateCall();                break
    case 'AddUser':     await panel.AddUser();                   break
    case 'RemoveUser':  await panel.RemoveUser();                break
    case 'Transcript':  await ticket.transcript({ channelId }); break
    case 'Delete':      await ticket.delete({ channelId });     break
    }
  },
})
