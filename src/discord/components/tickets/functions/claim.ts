import { db } from '@/app'
import { CustomButtonBuilder, Discord } from '@/functions'
import { type Ticket as TicketDBType, type TicketConfig } from '@/interfaces/Ticket'
import { ActionRowBuilder, type ButtonBuilder, type ButtonInteraction, ButtonStyle, type CacheType, ChannelType, type ChatInputCommandInteraction, codeBlock, EmbedBuilder, type ModalSubmitInteraction, PermissionsBitField, type StringSelectMenuInteraction, type TextChannel } from 'discord.js'
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
  }): Promise<void> {
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
    const embed = await this.genEmbed({ channelId })

    const message = await channelClaim.send({
      embeds: [embed],
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
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
          customId: `SaveLogs-${channelId}`,
          type: 'Ticket',
          style: ButtonStyle.Primary,
          disabled: true
        }),
        new CustomButtonBuilder({
          emoji: { name: '🗑️' },
          label: 'Deletar',
          customId: `Delete-${channelId}`,
          type: 'Ticket',
          style: ButtonStyle.Danger
        })
      )]
    })
    await db.tickets.push(`${guildId}.tickets.${channelId}.messages`, { channelId: message?.channelId, messageId: message?.id })
  }

  async genEmbed ({ channelId }: { channelId: string }): Promise<EmbedBuilder> {
    const { guild, guildId } = this.interaction
    const { category: { emoji, title }, owner, createAt, team } = await db.tickets.get(`${guildId}.tickets.${channelId}`) as TicketDBType
    const user = guild?.client.users.cache.find((user) => user.id === owner)
    return new EmbedBuilder({
      title: '🎫 Um novo ticket foi aberto!',
      fields: [
        { name: '🙋‍♂️ User:', value: codeBlock(`Name: ${user?.displayName ?? 'Saiu do servidor'}, Id: ${owner}`) },
        { name: '🗂️ Categoria', value: codeBlock(`${emoji} ${title}`) },
        { name: '👨🏻‍💻 Team support:', value: codeBlock(team?.map((user) => user.displayName).join(', ') ?? 'Ninguém reivindicou esse ticket ainda!') },
        { name: '🕗 Aberto:', value: `<t:${createAt}:R>` }
      ],
      footer: ({ text: `Equipe ${guild?.name} | Todos os Direitos Reservados`, icon_url: (guild?.iconURL({ size: 64 }) ?? undefined) })
    }).setColor((team ?? []).length === 0 ? 'Red' : 'Green').setColor('Red')
  }

  async Claim ({ key }: { key: string }): Promise<void> {
    const interaction = this.interaction
    if (interaction.isChatInputCommand()) return
    const { message, guildId, user, guild } = interaction
    const channelId = key.split('-')[1]
    const channelTicket = guild?.channels.cache.find((channel) => channel.id === channelId) as TextChannel
    const { team, owner } = await db.tickets.get(`${guildId}.tickets.${channelId}`) as TicketDBType
    const userTicket = guild?.client.users.cache.find((user) => user.id === owner)

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

    await db.tickets.push(`${guildId}.tickets.${channelId}.team`, { name: user.username, displayName: user.displayName, id: user.id })
    await message?.edit({ embeds: [await this.genEmbed({ channelId })] })
    await this.interaction.editReply({
      embeds: [
        new EmbedBuilder({
          title: `Olá ${user.username}`,
          description: '✅ | Você foi adicionado ao ticket!'
        }).setColor('Green')
      ],
      components: [goChannel]
    })
    await interaction.channel?.send({
      embeds: [new EmbedBuilder({
        title: `Usuário ${user.displayName}, reivindicou o ticket do ${userTicket?.displayName}!`
      }).setColor('Green')]
    }).then(async (message) => {
      await db.tickets.push(`${guildId}.tickets.${channelId}.messages`, { channelId: this.interaction.channelId, messageId: message.id })
    })
    await channelTicket.send({
      embeds: [new EmbedBuilder({
        title: `Usuário ${user.displayName}, reivindicou o ticket!`
      }).setColor('Green')]
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
