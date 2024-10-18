import Claim from '@/entity/Claim.entry.js'
import Config, { type Roles } from '@/entity/Config.entry.js'
import Ticket from '@/entity/Ticket.entry.js'
import { claimDB, configDB, ticketDB } from '@/utils/database.js'
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChannelType, codeBlock, CommandInteraction, EmbedBuilder, Message, ModalSubmitInteraction, type OverwriteResolvable, PermissionsBitField, StringSelectMenuInteraction } from 'discord.js'
import { ActionDrawer } from 'utils'
import { Error } from 'discord'

interface ClaimOptions {
    ticketId: number
    channelId: string
}

type Interaction = CommandInteraction<'cached'> | ModalSubmitInteraction<'cached'> | ButtonInteraction<'cached'> | StringSelectMenuInteraction<'cached'> | Message<true>


export class ClaimBuilder {
  private readonly interaction: Interaction
  private options!: ClaimOptions
  private ticketData: Ticket | undefined
  public embed!: EmbedBuilder | undefined
  public buttons!: ActionRowBuilder<ButtonBuilder>[] | undefined

  constructor ({ interaction }: { interaction: Interaction }) {
    this.interaction = interaction
    this.options = {
      channelId: '',
      ticketId: 0
    }
  }

  setTicketId(ticketId: number) { this.options.ticketId = ticketId ; return this }
  setData (ticket: Ticket) { this.ticketData = ticket; return this }

  private permissions (roles: Roles[]): OverwriteResolvable[] {
    const permissionOverwrites: OverwriteResolvable[] = []

    const permissions = [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.AddReactions,
      PermissionsBitField.Flags.ReadMessageHistory,
    ]

    permissionOverwrites.push({
      id: this.interaction.guild.id,
      deny: [PermissionsBitField.Flags.ViewChannel]
    })
    for (const role of roles) {
      permissionOverwrites.push({
        id: role.id,
        allow: permissions
      })
    }

    return permissionOverwrites
  }

  async render() {
    const { guild } = this.interaction
    const ticketData = this.ticketData !== undefined ? this.ticketData : await ticketDB.findOne({ where: { id: this.options.ticketId } })
    if (ticketData === null || ticketData === undefined) throw await new Error({ element: 'ticket', interaction: this.interaction }).notFound({ type: 'Database' }).reply()
    const { team, ownerId, category: { emoji, title }, description, createAt } = ticketData
    const user = (await guild.members.fetch()).find((user) => user.id === ownerId)

    const embed = new EmbedBuilder({
      title: team.length === 0 ? '🎫 Um novo ticket foi aberto!' : '🎫 Ticket reivindicado!',
      fields: [
        { name: '🧑🏻‍💻 User:', value: codeBlock(`Name: ${user?.displayName ?? user?.nickname ?? 'Saiu do servidor'}`), inline: true },
        { name: '🪪 ID:', value: codeBlock(ownerId), inline: true },
        { name: '\u200E', value: '\u200E', inline: true }
      ],
      footer: ({ text: `Equipe ${guild?.name} | Todos os Direitos Reservados`, icon_url: (guild?.iconURL({ size: 64 }) ?? undefined) })
    }).setColor(team.length === 0 ? 'Red' : 'Orange')

    if (team.length === 0) {
      embed.addFields([
        { name: '❓ Motivo:', value: codeBlock(`${emoji} ${title}`), inline: true },
        { name: '📃 Descrição:', value: codeBlock(description ?? 'Desconhecido'), inline: true },
        { name: '\u200E', value: '\u200E', inline: true }
      ])
    }
    embed.addFields([
      { name: '👨🏻‍💻 Team support:', value: codeBlock(team.length === 0 ? 'Ninguém reivindicou esse ticket ainda!' : team.map((user) => user.displayName).join(', ')), inline : true},
      { name: '🕗 Aberto:', value: `<t:${Math.floor(new Date(createAt).getTime() / 1000)}:R>` }
    ])
    const buttons = ActionDrawer([
      new ButtonBuilder({
        emoji: { name: '🛎️' },
        label: 'Responder',
        customId: 'Claim',
        style: ButtonStyle.Success,
        disabled: ticketData.team.length !== 0
      }),
      new ButtonBuilder({
        emoji: { name: '📃' },
        label: 'Salvar Logs',
        customId: 'Transcript',
        style: ButtonStyle.Primary
      }),
      new ButtonBuilder({
        customId: 'Switch',
        label: ticketData.closed ? 'Abrir' : 'Fechar',
        emoji: { name: ticketData.closed ? '🔒' : '🔓' },
        style: ticketData.closed ? ButtonStyle.Success : ButtonStyle.Danger
      }),
      new ButtonBuilder({
        emoji: { name: '🗑️' },
        label: 'Deletar',
        customId: 'Delete',
        style: ButtonStyle.Danger
      }),
      new ButtonBuilder({
        emoji: { name: '🎫' },
        label: 'Ir ao Ticket',
        url: `https://discord.com/channels/${this.interaction.guildId}/${ticketData.channelId}`,
        style: ButtonStyle.Link
      })
    ], 4)
    this.embed = embed
    this.buttons = buttons
    return this
  }
  async create(): Promise<Claim | Claim[] | undefined> {
    const { guildId, guild } = this.interaction
    const ticketData = this.ticketData !== undefined ? this.ticketData : await ticketDB.findOne({ where: { id: this.options.ticketId } })
    if (ticketData === null) throw await new Error({ element: 'executar a ação de criação do claim, pois o setData ou setTicketId não foi definido!', interaction: this.interaction }).notPossible().reply()

    const configs = await configDB.findOne({ where: { guild: { guildId: guildId } }, relations: { guild: true } }) as Config
    const permissions = this.permissions(configs?.roles ?? [])
  
    if (this.embed === undefined || this.buttons === undefined) await this.render()

    async function createChannel () {
      const newGuild = await guild.channels.create({ name: '🎫・ticket-claim', type: ChannelType.GuildText })
      await configDB.update({ id: configs.id }, { claimId: newGuild.id })
      return newGuild
    }

    const channel = configs?.claimId !== undefined ?
      (await guild.channels.fetch()).find((channel) => channel?.type === ChannelType.GuildText && channel.id === configs.claimId) ?? await createChannel()
      : await createChannel()

    await channel.edit({ permissionOverwrites: permissions })
    if (channel.isTextBased()) {
      const message = await channel.send({ embeds: [this.embed as EmbedBuilder], components: this.buttons })
      const claimData = await claimDB.create({ channelId: channel.id, messageId: message.id, ticket: ticketData ?? undefined })
      const result = await claimDB.save(claimData) as Claim

      if (result === null || result === undefined) {
        await new Error({ element: 'criar o claim', interaction: this.interaction }).notPossible().reply()
        return
      }
      return claimData
    }
    return
  }

  async edit ({ messageId }: { messageId: string }) {
    const claimData = await claimDB.findOne({ where: { messageId } })
    if (claimData === null) throw await new Error({ element: 'o claim', interaction: this.interaction }).notFound({ type: 'Database' }).reply()
    
    const channel = await this.interaction.client.channels.fetch(claimData.channelId).catch(async() => null)
    if (channel === null) throw await new Error({ element: 'do claim', interaction: this.interaction }).notFound({ type: 'Channel' }).reply()
    if (!channel.isTextBased()) throw await new Error({ element: 'concluir a ação, pois o channel não é um TextBased', interaction: this.interaction }).notPossible().reply()

    if (this.embed === undefined || this.buttons) await this.render()

    const message = await channel.messages.fetch(claimData.messageId).catch(() => null)
    if (message === null) throw await new Error({ element: 'message do claim', interaction: this.interaction }).notFound({ type: 'Database' }).reply()
    await message.edit({
      embeds: [this.embed as EmbedBuilder],
      components: this.buttons
    })
  }

  async delete (id: number) {
    const claimData = await claimDB.findOne({ where: { id } })
    if (claimData === null) return await new Error({ element: 'claim', interaction: this.interaction }).notFound({ type: 'Database' }).reply()

    const channel = await this.interaction.client.channels.fetch(claimData.channelId).catch(async() => null)
    if (channel === null) return await new Error({ element: 'do claim', interaction: this.interaction }).notFound({ type: 'Channel' }).reply()
    if (!channel.isTextBased()) return await new Error({ element: 'concluir a ação, pois o channel não é um TextBased', interaction: this.interaction }).notPossible().reply()

    const message = await channel.messages.fetch(claimData.messageId).catch(() => null)
    if (message !== null && message.deletable) await message.delete()

    await claimDB.delete({ id })
    return this
  }
}