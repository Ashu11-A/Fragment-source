import Template from '@/entity/Template.entry.js'
import Ticket, { type Event, type History, type TicketCategories, type Message as TicketMessage, type TicketType, type User as UserTicket, type Voice } from '@/entity/Ticket.entry.js'
import { guildDB } from '@/utils/database.js'
import { ButtonBuilder, Error } from 'discord'
import { ActionRowBuilder, ButtonInteraction, ButtonStyle, ChannelType, CommandInteraction, EmbedBuilder, Message, ModalSubmitInteraction, type OverwriteResolvable, PartialGroupDMChannel, PermissionsBitField, StringSelectMenuInteraction, TextChannel, User, codeBlock } from 'discord.js'
import { Database } from 'socket-client'
import { ActionDrawer, buttonRedirect } from 'utils'
import { ClaimBuilder } from './ClaimBuilder.js'
import { Ticket as TicketFunctions } from './Ticket.js'

type Interaction = CommandInteraction<'cached'> | ModalSubmitInteraction<'cached'> | ButtonInteraction<'cached'> | StringSelectMenuInteraction<'cached'> | Message<true>

const ticket = new Database<Ticket>({ table: 'Ticket' })
const template = new Database<Template>({ table: 'Template' })

export class TicketBuilder {
  public options!: TicketType
  public embed?: EmbedBuilder
  public buttons?: ActionRowBuilder<ButtonBuilder>[]
  private user!: User
  private channelId?: string
  private ticketId?: number
  private templateId?: number
  private readonly interaction: Interaction
  constructor ({ interaction }: { interaction: Interaction }) {
    this.interaction = interaction
    if (interaction instanceof Message) {
      this.user = interaction.author
    } else {
      this.user = interaction.user
    }
    this.options = {
      ownerId: undefined,
      title: undefined,
      description: undefined,
      closed: false,
      channelId: undefined,
      messageId: undefined,
      voice: undefined,
      category: { emoji: '🎫', title: 'Tickets' },
      team: [],
      users: [],
      messages: [],
      history: [],
      events: []
    }
  }

  setData(data: Ticket) { 
    this.options = Object.assign(this.options, data)
    this.ticketId = data.id
    return this
  }
  setTicket (channelId: string) { this.channelId = channelId; return this }
  setTemplateId (id: number) { this.templateId = id; return this}
  
  setOwner (id: string) { this.options.ownerId = id; return this }
  setTitle (content: string) { this.options.title = content; return this }
  setDescription(content: string) { this.options.description = content; return this }
  setClosed(isClosed: boolean) { this.options.closed = isClosed ?? false; return this }
  setVoice(voice: Voice) { this.options.voice = voice; return this }
  setCategory (category: TicketCategories) { this.options.category = category; return this }
  setUser (user: User) { this.user = user; return this }


  addTeam (user: UserTicket) { this.options.team.push(user); return this }
  addUsers (user: UserTicket) { this.options.users.push(user); return this }
  addEvent (event: Event) { this.options.events.push(event); return this }
  addHistory (content: History) { this.options.history.push(content); return this }
  addMessage (message: TicketMessage) { this.options.messages.push(message); return this }

  public permissions (): OverwriteResolvable[] {
    const { guild } = this.interaction
    const { team, users, ownerId } = this.options
    const permissionOverwrites: OverwriteResolvable[] = []
    const permissions = [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.AttachFiles,
      PermissionsBitField.Flags.AddReactions,
      PermissionsBitField.Flags.ReadMessageHistory
    ]

    if (ownerId !== '' && ownerId !== undefined) permissionOverwrites.push({ id: ownerId, allow: permissions })
    
    permissionOverwrites.push({ id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] })
    permissionOverwrites.push({ id: this.user.id, allow: permissions })

    for (const user of team) permissionOverwrites.push({ id: user.id, allow: permissions })
    for (const user of users) permissionOverwrites.push({ id: user.id, allow: permissions })

    return permissionOverwrites
  }

  render() {
    const { guild } = this.interaction
    const { description, title, closed } = this.options
    const isOpen = !closed

    const embed = new EmbedBuilder({
      title: `👋 Olá ${this.user.displayName}, boas vindas ao seu ticket.`,
      footer: { text: `Equipe ${guild?.name} | ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`, iconURL: (guild?.iconURL({ size: 64 }) ?? undefined) }
    }).setColor('Blue')

    if (typeof title === 'string') embed.addFields({ name: '📃 Motivo:', value: codeBlock(title) })
    if (typeof description === 'string') embed.addFields({ name: '📭 Descrição:', value: codeBlock(description) })

    const buttons: ButtonBuilder[] = []
    buttons.push(
      new ButtonBuilder({
        customId: 'Switch',
        label: isOpen ? 'Fechar' : 'Abrir',
        emoji: { name: isOpen ? '🔓' : '🔒' },
        style: isOpen ? ButtonStyle.Danger : ButtonStyle.Success
      }),
      new ButtonBuilder({
        customId: 'Panel',
        label: 'Painel',
        emoji: { name: '🖥️' },
        style: ButtonStyle.Success
      })
    )
    if (!isOpen) {
      buttons.push(
        new ButtonBuilder({
          customId: 'Close-With-Question',
          label: 'Fechar com Relatorio',
          emoji: { name: '📝' },
          style: ButtonStyle.Primary
        }),
        new ButtonBuilder({
          customId: 'Close',
          label: 'Fechar',
          emoji: { name: '🗑️' },
          style: ButtonStyle.Danger
        })
      )
    }

    this.embed = embed
    this.buttons = ActionDrawer(buttons, 5)
    return this
  }

  async create (): Promise<Ticket | null | undefined | void> {
    const { guild } = this.interaction
    const { category: categoryData } = this.options
    if (guild === null || this.interaction instanceof Message || this.interaction instanceof CommandInteraction) return
    if (!this.interaction.deferred) await this.interaction.deferReply({ ephemeral: true })
    const request = this?.templateId !== undefined ? { id: this.templateId } : { messageId: this.interaction.message?.id }
    const templateData = await template.findOne({ where: request })
    if (templateData === null) return await new Error({ element: 'esse template', interaction: this.interaction }).notFound({ type: 'Database' }).reply()

    const category = (await guild.channels.fetch()).find((channel) => channel?.type === ChannelType.GuildCategory && channel.name === categoryData.title)
        ?? await guild.channels.create({
          name: categoryData.title,
          type: ChannelType.GuildCategory
        })
        

    const channel = await guild.channels.create({
      name: `${categoryData.emoji}-${this.user.displayName}`,
      type: ChannelType.GuildText,
      topic: `Ticket do(a) ${this.user.username}, ID: ${this.user.id}`,
      permissionOverwrites: this.permissions(),
      parent: category.id
    })

    if (this.embed === undefined || this.buttons === undefined) this.render()
    const messageMain = await channel.send({ embeds: [this.embed as EmbedBuilder], components: this.buttons })

    const guildRelaction = await guildDB.findOne({ where: { guildId: guild.id } })
    if (guildRelaction === null) return await new Error({ element: 'Guild', interaction: this.interaction }).notFound({ type: 'Database' }).reply()

    const templateRelaction = await template.findOne({ where: { id: this.templateId } })
    if (templateRelaction === null) return await new Error({ element: 'Template', interaction: this.interaction }).notFound({ type: 'Database' }).reply()

    this.options = Object.assign(this.options, {
      channelId: channel.id,
      messageId: messageMain.id,
      guild: guildRelaction,
      template: templateRelaction
    })

    const ticketData = await ticket.create(this.options)
    const result = await ticket.save(ticketData) as Ticket

    if (result === null || result === undefined) {
      await channel.delete('Error')
      await new Error({ element: 'salvar os dados no Database', interaction: this.interaction }).notPossible().reply()
      return null
    }

    const claimError = new Error({ element: 'criar o claim do seu ticket', interaction: this.interaction }).notPossible()
    const claim = await new ClaimBuilder({ interaction: this.interaction })
      .setData(result)
      .render()
    
    if (claim === undefined) { await claimError.reply(); return }
    const create = await claim.create()
    if (create === undefined) { await claimError.reply(); return }

    await this.interaction.editReply({
      embeds: [new EmbedBuilder({ title: '✅ Seu Ticket foi criado com sucesso!' }).setColor('Green')],
      components: [buttonRedirect({
        channelId: channel.id,
        guildId: guild.id,
        label: 'Ir ao Ticket',
        emoji: { name: '🎫' }
      })]
    })
    return ticketData
  }

  async loader() {
    if (this.channelId === undefined) throw new Error({ element: 'executar essa ação, pois setTicket não foi configurado!', interaction: this.interaction }).notPossible().reply()

    const ticketData = await ticket.findOne({ where: { channelId: this.channelId } })
    
    if (ticketData !== null) this.options = ticketData
    return this
  }

  async delete (options?: { reason?: string, observation?: string }) {
    if (this.interaction instanceof Message) return
    const claimBuilder = new ClaimBuilder({ interaction: this.interaction })
    const ticketData = await ticket.findOne({ where: { channelId: this.channelId }, relations: { claim: true } })
    if (ticketData === null) { await new Error({ element: 'as informações do ticket', interaction: this.interaction }).notFound({ type: 'Database' }).reply(); return }
    
    const channel = await this.interaction.client.channels.fetch(ticketData.channelId).catch(() => null)
    if (!channel?.isTextBased()) { await new Error({ element: ticketData.channelId, interaction: this.interaction }).notFound({ type: 'Channel' }).reply(); return }

    await channel.delete()
    for (const { channelId, messageId } of ticketData.messages) {
      const channel = await this.interaction.client.channels.fetch(channelId).catch(() => null)
      if (channel === null || !channel.isTextBased()) continue
    
      const message = await channel.messages.fetch(messageId).catch(() => null)
      if (message === null) continue

      if (message.deletable) await message.delete()
    }
    await new TicketFunctions({ interaction: this.interaction }).transcript({ messageId: ticketData.claim.messageId, observation: options?.observation, reason: options?.reason })
    await ticket.delete({ id: ticketData.id })
    await claimBuilder.delete(ticketData.claim.id)
  }

  async edit () { 
    if (this.ticketId === undefined) throw new Error({ element: 'executar essa ação, pois o Id do ticket não foi setado!', interaction: this.interaction }).notPossible().reply()

    await ticket.update({ id: this.ticketId }, this.options)
    return this
  }

  async send (embeds: EmbedBuilder[]) {
    if (this.ticketId === undefined) throw new Error({ element: 'executar essa ação, pois o Id do ticket não foi setado!', interaction: this.interaction }).notPossible().reply()

    const ticketData = await ticket.findOne({ where: { id: this.ticketId } })
    if (ticketData === null) { await new Error({ element: 'as informações do ticket', interaction: this.interaction }).notFound({ type: 'Database' }).reply(); return }
      
    const channel = await this.interaction.client.channels.fetch(ticketData.channelId).catch(() => null)
    if (channel === null && channel === undefined || !channel?.isTextBased() || channel instanceof PartialGroupDMChannel) { await new Error({ element: ticketData.channelId, interaction: this.interaction }).notFound({ type: 'Channel' }).reply(); return }
  
    await channel.send({ embeds })
    return this
  }

  async update () {
    if (this.ticketId === undefined) throw new Error({ element: 'executar essa ação, pois o Id do ticket não foi setado!', interaction: this.interaction }).notPossible().reply()

    const ticketData = await ticket.findOne({ where: { id: this.ticketId } })
    if (ticketData === null) { await new Error({ element: 'as informações do ticket', interaction: this.interaction }).notFound({ type: 'Database' }).reply(); return }
    
    const channel = await this.interaction.client.channels.fetch(ticketData.channelId).catch(() => null)
    if (channel === null && channel === undefined || !channel?.isTextBased()) { await new Error({ element: ticketData.channelId, interaction: this.interaction }).notFound({ type: 'Channel' }).reply(); return }

    const message = await channel.messages.fetch(ticketData.messageId).catch(() => null)
    if (message === null) { await new Error({ element: ticketData.messageId, interaction: this.interaction }).notFound({ type: 'Message' }).reply(); return }

    if (this.embed === undefined || this.buttons === undefined) this.render()
    const embed = this.embed as EmbedBuilder
    const buttons = this.buttons as ActionRowBuilder<ButtonBuilder>[]

    await this.edit()
    await (channel as TextChannel).edit({ permissionOverwrites: this.permissions() })
    await message.edit({ embeds: [embed], components: buttons })
    return this
  }
}