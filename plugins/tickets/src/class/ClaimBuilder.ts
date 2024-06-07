import { Database } from "@/controller/database"
import { Error } from "@/discord/base/CustomResponse"
import Claim from "@/entity/Claim.entry"
import Config, { Roles } from "@/entity/Config.entry"
import Ticket from "@/entity/Ticket.entry"
import { ActionDrawer } from "@/functions/actionDrawer"
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChannelType, codeBlock, CommandInteraction, EmbedBuilder, Message, ModalSubmitInteraction, OverwriteResolvable, PermissionsBitField, StringSelectMenuInteraction } from "discord.js"
const ticket = new Database<Ticket>({ table: 'Ticket' })
const claim = new Database<Claim>({ table: 'Claim' })
const config = new Database<Config>({ table: 'Config' })

interface ClaimOptions {
    ticketId: number
    channelId: string
}

type Interaction = CommandInteraction<'cached'> | ModalSubmitInteraction<'cached'> | ButtonInteraction<'cached'> | StringSelectMenuInteraction<'cached'> | Message<true>


export class ClaimBuilder {
  private readonly interaction: Interaction
  private options!: ClaimOptions
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
    const ticketData = await ticket.findOne({ where: { id: this.options.ticketId } })
    if (ticketData === null) { await new Error({ element: 'ticket', interaction: this.interaction }).notFound({ type: 'Database' }).reply(); return }
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
        { name: '📃 Descrição:', value: codeBlock(description ?? 'Nada foi dito'), inline: true },
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
        customId: `Claim`,
        style: ButtonStyle.Success,
        disabled: ticketData.team.length !== 0
      }),
      new ButtonBuilder({
        emoji: { name: '📃' },
        label: 'Salvar Logs',
        customId: `Transcript`,
        style: ButtonStyle.Primary
      }),
      new ButtonBuilder({
        customId: `Switch`,
        label: ticketData.closed ? 'Abrir' : 'Fechar',
        emoji: { name: ticketData.closed ? '🔒' : '🔓' },
        style: ticketData.closed ? ButtonStyle.Success : ButtonStyle.Danger
      }),
      new ButtonBuilder({
        emoji: { name: '🗑️' },
        label: 'Deletar',
        customId: `Delete`,
        style: ButtonStyle.Danger
      }),
      new ButtonBuilder({
        emoji: { name: '🎫' },
        label: 'Ir ao Ticket',
        url: `https://discord.com/channels/${this.interaction.guildId}/${ticketData.channelId}`,
        style: ButtonStyle.Link
      })
    ], 5)
    this.embed = embed
    this.buttons = buttons
    return this
  }
  async create(): Promise<Claim | Claim[] | undefined> {
    const { guildId, guild } = this.interaction
    const configs = await config.findOne({ where: { guild: { id: guildId } }, relations: { guild: true } }) as Config
    const permissions = this.permissions(configs?.roles ?? [])
  
    if (this.embed === undefined || this.buttons === undefined) await this.render()

    async function createChannel () {
      const newGuild = await guild.channels.create({ name: 'claim-tickets', type: ChannelType.GuildText })
      await config.update({ id: configs.id }, { claimId: newGuild.id })
      return newGuild
    }

    const channel = configs?.claimId !== undefined ?
      (await guild.channels.fetch()).find((channel) => channel?.type === ChannelType.GuildText && channel.id === configs.claimId) ?? await createChannel()
      : await createChannel()

    await channel.edit({ permissionOverwrites: permissions })
    if (channel.isTextBased()) {
      const message = await channel.send({ embeds: [this.embed as EmbedBuilder], components: this.buttons })
      const claimData = await claim.create({ channelId: channel.id, messageId: message.id })
      const result = await claim.save(claimData) as Claim
      await ticket.update({ id: this.options.ticketId }, { claim: { id: result.id } })
      return claimData
    }
    return
  }

  async delete ({ id }: { id: number }) {
    const claimData = await claim.findOne({ where: { id } })
    if (claimData === null) return await new Error({ element: 'claim', interaction: this.interaction }).notFound({ type: 'Database' }).reply()

    const channel = await this.interaction.client.channels.fetch(claimData.channelId).catch(async() => null)

    if (channel === null) return await new Error({ element: 'do claim', interaction: this.interaction }).notFound({ type: "Channel" }).reply()
    if (!channel.isTextBased()) return await new Error({ element: 'concluir a ação, pois o channel não é um TextBased', interaction: this.interaction }).notPossible().reply()


    const message = await channel.messages.fetch(claimData.messageId).catch(() => null)
    if (message !== null && message.deletable) await message.delete()

    await claim.delete({ id })
    return this
  }

  // update({ id }: { id: number }) {
  //   claim
  // }
}