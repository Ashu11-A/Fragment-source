import { console } from "@/controller/console";
import { Database } from "@/controller/database";
import { Discord } from "@/discord/base";
import { Error } from "@/discord/base/CustomResponse";
import Config from "@/entity/Config.entry";
import Ticket, { History, Message, TicketCategories, TicketType, User, Voice } from "@/entity/Ticket.entry";
import { ButtonInteraction, CacheType, ChannelType, CommandInteraction, EmbedBuilder, ModalSubmitInteraction, OverwriteResolvable, PermissionsBitField, StringSelectMenuInteraction, TextChannel, codeBlock } from "discord.js";

type Interaction = CommandInteraction<CacheType> | ModalSubmitInteraction<CacheType> | ButtonInteraction<CacheType> | StringSelectMenuInteraction<CacheType>

const ticket = new Database<Ticket>({ table: 'Ticket' })
const config = new Database<Config>({ table: 'Config' })

export class TicketBuilder {
  private options!: TicketType
  private embed!: EmbedBuilder
  private readonly interaction: Interaction
  constructor ({ interaction }: { interaction: Interaction }) {
    this.interaction = interaction
    this.options = {
      ownerId: '',
      title: undefined,
      description: undefined,
      closed: false,
      channelId: '',
      messageId: '',
      category: { emoji: '🎫', title: 'Tickets' },
      team: [],
      users: [],
      messages: [],
      history: []
    }
  }

  setOwner (id: string) { this.options.ownerId = id; return this }
  setTitle (content: string) { this.options.title = content; return this }
  setDescription(content: string) { this.options.description = content; return this }
  setClosed(isClosed: boolean) { this.options.closed = isClosed ?? false; return this }
  setVoice(voice: Voice) { this.options.voice = voice; return this }
  setCategory (category: TicketCategories) { this.options.category = category; return this }
  setClaim (message: Message) { this.options.claim = message; return this }

  addUsers (user: User) { this.options.users.push(user); return this }
  addTeam (user: User) { this.options.team.push(user); return this }
  addMessage (message: Message) { this.options.messages.push(message); return this }
  addHistory (content: History) { this.options.history.push(content) }

  private permissions () {
    const { guild, user } = this.interaction
    const { team, users, ownerId } = this.options
    const permissionOverwrites: OverwriteResolvable[] = []
    const permissions = [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.AttachFiles,
      PermissionsBitField.Flags.AddReactions,
      PermissionsBitField.Flags.ReadMessageHistory
    ]

    if (guild) permissionOverwrites.push({
      id: guild.id,
      deny: [PermissionsBitField.Flags.ViewChannel]
    })

    for (const user of team) {
      permissionOverwrites.push({
        id: user.id,
        allow: permissions
      })
    }

    for (const user of users) {
      permissionOverwrites.push({
        id: user.id,
        allow: permissions
      })
    }

    if (ownerId !== '' && ownerId !== undefined) {
      permissionOverwrites.push({
        id: ownerId,
        allow: permissions
      })
    }

    permissionOverwrites.push({
      id: user.id,
      allow: permissions
    })

    return permissionOverwrites
  }

  render() {
    const { guild, user } = this.interaction
    const { description, title } = this.options

    const embed = new EmbedBuilder({
      title: `👋 Olá ${user.displayName}, boas vindas ao seu ticket.`,
      footer: { text: `Equipe ${guild?.name} | ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`, iconURL: (guild?.iconURL({ size: 64 }) ?? undefined) }
    })

    if (title !== undefined) embed.addFields({ name: '📃 Motivo:', value: codeBlock(title) })
    if (description !== undefined) embed.addFields({ name: '📭 Descrição:', value: codeBlock(description) })

    this.embed = embed
    return this
  }

  async create (): Promise<Ticket | null | undefined> {
    const { guild, user } = this.interaction
    const { category: categoryData } = this.options
    if (guild === null) return
    if (!this.interaction.deferred) await this.interaction.deferReply({ ephemeral: true })

    const category = (await guild.channels.fetch()).find((channel) => channel?.type === ChannelType.GuildCategory && channel.name === categoryData.title)
        ?? await guild.channels.create({
          name: categoryData.title,
          type: ChannelType.GuildCategory
        })
        

    const channel = await guild.channels.create({
      name: `${categoryData.emoji}-${user.displayName}`,
      type: ChannelType.GuildText,
      topic: `Ticket do(a) ${user.username}, ID: ${user.id}`,
      permissionOverwrites: this.permissions(),
      parent: category.id
    })

    if (this.embed === undefined) this.render()
    const embed = this.embed

    const messageMain = await channel.send({ embeds: [embed] })

    this.options = {
      ...this.options,
      channelId: channel.id,
      messageId: messageMain.id,
    }

    const ticketData = await ticket.create(this.options)

    return await ticket.save(ticketData)
      .then(async () => {
        await this.interaction.editReply({
          embeds: [new EmbedBuilder({ title: '✅ Seu Ticket foi criado com sucesso!' }).setColor('Green')],
          components: [Discord.buttonRedirect({
            channelId: channel.id,
            guildId: guild.id,
            label: 'Ir ao Ticket',
            emoji: { name: '🎫' }
          })]
        })
        return ticketData
      })
      .catch(async (err) => {
        console.error(err)
        await channel.delete('Error')
        await new Error({ element: 'salvar os dados no Database', interaction: this.interaction }).notPossible().reply()
        return null
      })
  }

  async load({ id }: { id: number }) {
    const ticketData = await ticket.findOne({ where: { id } })
    if (ticketData) this.options = ticketData
  }

  async delete ({ id }: { id: number }) {
    const ticketData = await ticket.findOne({ where: { id } })
    if (ticketData === null) { await new Error({ element: 'as informações do ticket', interaction: this.interaction }).notFound({ type: 'Database' }).reply(); return }
    
    const channel = await this.interaction.client.channels.fetch(ticketData.channelId).catch(() => null)
    if (!channel?.isTextBased()) { await new Error({ element: ticketData.channelId, interaction: this.interaction }).notFound({ type: 'Channel' }).reply(); return }

    await channel.delete()
    await ticket.delete({ id })
  }

  async update ({ id }: { id: number }) {
    const ticketData = await ticket.findOne({ where: { id } })
    if (ticketData === null) { await new Error({ element: 'as informações do ticket', interaction: this.interaction }).notFound({ type: 'Database' }).reply(); return }
    
    const channel = await this.interaction.client.channels.fetch(ticketData.channelId).catch(() => null)
    if (channel === null && channel === undefined || !channel?.isTextBased()) { await new Error({ element: ticketData.channelId, interaction: this.interaction }).notFound({ type: 'Channel' }).reply(); return }

    const message = await channel.messages.fetch(ticketData.messageId).catch(() => null)
    if (message === null) { await new Error({ element: ticketData.messageId, interaction: this.interaction }).notFound({ type: 'Message' }).reply(); return }

    if (this.embed === undefined) this.render()
    const embed = this.embed

    await ticket.update({ id }, { ...this.options })
    await (channel as TextChannel).edit({ permissionOverwrites: this.permissions() })
    await message.edit({ embeds: [embed] })
    return this
  }
}