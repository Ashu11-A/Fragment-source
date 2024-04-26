import { db } from '@/app'
import { CustomButtonBuilder, Discord } from '@/functions'
import { type TicketConfig, type Ticket as TicketDBType } from '@/interfaces/Ticket'
import { ActionRowBuilder, type ButtonBuilder, type ButtonInteraction, ButtonStyle, type CacheType, ChannelType, type ChatInputCommandInteraction, codeBlock, EmbedBuilder, type Message, type ModalSubmitInteraction, PermissionsBitField, type StringSelectMenuInteraction, TextChannel } from 'discord.js'
import { Ticket } from './ticket'

interface TicketClaimType {
  interaction: StringSelectMenuInteraction<CacheType> | ButtonInteraction<CacheType> | ModalSubmitInteraction<CacheType> | ChatInputCommandInteraction<CacheType>
}

export class TicketClaim {
  private readonly interaction
  constructor ({ interaction }: TicketClaimType) {
    this.interaction = interaction
  }

  async create ({ channelId }: {
    channelId: string
  }): Promise<Message<true> | undefined> {
    const interaction = this.interaction
    if (!interaction.inCachedGuild()) return
    const { guild, guildId } = interaction
    const ticketConfig = await db.guilds.get(`${guildId}.config.ticket`) as TicketConfig
    let channelClaim: TextChannel | undefined

    channelClaim = interaction.guild.channels.cache.find((channel) => channel.id === ticketConfig?.claimId && channel.isTextBased()) as TextChannel | undefined
    if (channelClaim === undefined) {
      channelClaim = await guild.channels.create({
        name: '📨-tickets',
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel]
          }
        ]
      })
      await db.guilds.set(`${guildId}.config.ticket.claimId`, channelClaim.id)
    }
    const embed = await this.embed({ channelId })
    const buttons = await this.buttons({ channelId })

    const message = await channelClaim.send({
      embeds: [embed],
      components: [buttons]
    })
    return message
  }

  async edit ({ channelId, messageId, channelTicketId }: { channelId: string, messageId: string, channelTicketId: string }): Promise<void> {
    const { guild } = this.interaction
    const channelClaim = await guild?.channels.fetch(channelId)

    if (!(channelClaim instanceof TextChannel)) {
      await this.interaction.editReply({
        embeds: [new EmbedBuilder({
          title: '❌ Não consegui achar o channel do claim!'
        }).setColor('Red')]
      })
      return
    }

    const messageClaim = await channelClaim.messages.fetch(messageId).catch(() => undefined)

    if (messageClaim === undefined) {
      await this.interaction.editReply({
        embeds: [new EmbedBuilder({
          title: '❌ A embed de gerenciamento do claim foi possivelmente apagada... Não é possivel prosseguir.'
        }).setColor('Red')]
      })
      return
    }

    await messageClaim?.edit({ components: [await this.buttons({ channelId: channelTicketId })] })
  }

  async embed ({ channelId }: { channelId: string }): Promise<EmbedBuilder> {
    const { guild, guildId } = this.interaction
    const { category: { emoji, title }, owner, createAt, team, description } = await db.tickets.get(`${guildId}.tickets.${channelId}`) as TicketDBType
    const user = guild?.client.users.cache.find((user) => user.id === owner)

    return new EmbedBuilder({
      title: '🎫 Um novo ticket foi aberto!',
      fields: [
        { name: '🙋‍♂️ User:', value: codeBlock(`Name: ${user?.displayName ?? 'Saiu do servidor'}`), inline },
        { name: '🪪 ID:', value: codeBlock(owner), inline },
        { name: '\u200E', value: '\u200E', inline },
        { name: '❓ Motivo:', value: codeBlock(`${emoji} ${title}`), inline },
        { name: '📃 Descrição:', value: codeBlock(description ?? 'Nada foi dito'), inline },
        { name: '\u200E', value: '\u200E', inline },
        { name: '👨🏻‍💻 Team support:', value: codeBlock(team?.map((user) => user.displayName).join(', ') ?? 'Ninguém reivindicou esse ticket ainda!'), inline },
        { name: '🕗 Aberto:', value: `<t:${Math.floor(createAt / 1000)}:R>` }
      ],
      footer: ({ text: `Equipe ${guild?.name} | Todos os Direitos Reservados`, icon_url: (guild?.iconURL({ size: 64 }) ?? undefined) })
    }).setColor((team ?? [])?.length === 0 ? 'Red' : 'Green')
  }

  async buttons ({ channelId }: { channelId: string }): Promise<ActionRowBuilder<ButtonBuilder>> {
    const { guildId } = this.interaction
    const ticket = await db.tickets.get(`${guildId}.tickets.${channelId}`) as TicketDBType
    const row = new ActionRowBuilder<ButtonBuilder>()
    row.addComponents(
      new CustomButtonBuilder({
        emoji: { name: '🛎️' },
        label: 'Responder',
        customId: `Claim-${channelId}`,
        type: 'Ticket',
        style: ButtonStyle.Success
      }),
      new CustomButtonBuilder({
        emoji: { name: '📃' },
        label: 'Salvar Logs',
        customId: `Transcript-${channelId}`,
        type: 'Ticket',
        style: ButtonStyle.Primary
      }),
      new CustomButtonBuilder({
        type: 'Ticket',
        permission: 'User',
        customId: `Switch-${channelId}`,
        label: ticket.closed ? 'Abrir' : 'Fechar',
        emoji: { name: ticket.closed ? '🔒' : '🔓' },
        style: ticket.closed ? ButtonStyle.Success : ButtonStyle.Danger
      }),
      new CustomButtonBuilder({
        emoji: { name: '🗑️' },
        label: 'Deletar',
        customId: `Delete-${channelId}`,
        type: 'Ticket',
        style: ButtonStyle.Danger
      })
    )
    return row
  }

  async Claim ({ key }: { key: string }): Promise<void> {
    const interaction = this.interaction
    if (interaction.isChatInputCommand()) return
    const { message, guildId, user, guild } = interaction
    const channelId = key.split('-')[1]
    const channelTicket = guild?.channels.cache.find((channel) => channel.id === channelId) as TextChannel
    const { team, owner } = await db.tickets.get(`${guildId}.tickets.${channelId}`) as TicketDBType
    const userTicket = guild?.client.users.cache.find((user) => user.id === owner)
    const ticket = new Ticket({ interaction })

    if (userTicket === undefined) {
      await interaction.editReply({
        embeds: [new EmbedBuilder({
          title: '⚠️ | Usuário não se encontra mais no servidor, você pode apenas apagar o ticket!'
        }).setColor('Red')]
      })
      return
    }

    const goChannel = await Discord.buttonRedirect({
      guildId,
      channelId: channelTicket.id,
      emoji: { name: '🎫' },
      label: 'Ir ao Ticket'
    })

    if ((team ?? []).find((userTeam) => userTeam.id === user.id) !== undefined ?? false) {
      await interaction.editReply({
        embeds: [new EmbedBuilder({
          title: '❌ | Você já está atendendo este ticket!'
        }).setColor('Red')],
        components: [goChannel]
      })
      return
    }

    if ((team ?? []).length >= 1) {
      await interaction.editReply({
        embeds: [new EmbedBuilder({
          title: '😔 Desculpe-me, mas apenas uma pessoa pode reivindicar o ticket!',
          description: `O usuário ${team?.[0].displayName} já tem a posse desse ticket.`
        }).setColor('Red')]
      })
      return
    }

    if (await ticket.Permissions({ channelId: channelTicket.id, userId: user.id, memberTeam: true })) return
    await message?.edit({ embeds: [await this.embed({ channelId })] })
    await interaction.channel?.send({
      embeds: [new EmbedBuilder({
        title: `Usuário ${user.displayName}, reivindicou o ticket do ${userTicket?.displayName}!`
      }).setColor('Green')]
    }).then(async (message) => {
      await db.tickets.push(`${guildId}.tickets.${channelId}.messages`, { channelId: this.interaction.channelId, messageId: message.id })
      await this.interaction.editReply({
        embeds: [
          new EmbedBuilder({
            title: `Olá ${user.username}`,
            description: '✅ | Você foi adicionado ao ticket!'
          }).setColor('Green')
        ],
        components: [goChannel]
      })
    })
  }

  async SaveLogs (): Promise<void> {

  }

  async Delete ({ key }: { key: string }): Promise<void> {
    const { guild } = this.interaction
    const channelId = key.split('-')[1]
    const channelTicket = guild?.channels.cache.find((channel) => channel.id === channelId) as TextChannel
    const Constructor = new Ticket({ interaction: this.interaction })
    await Constructor.delete({ type: 'delTicket', channelId: channelTicket.id })
  }
}
