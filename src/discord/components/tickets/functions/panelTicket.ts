import { db } from '@/app'
import { Discord } from '@/functions'
import { ActionRowBuilder, ButtonBuilder, type ButtonInteraction, ButtonStyle, type CacheType, ChannelType, type ChatInputCommandInteraction, EmbedBuilder, ModalBuilder, type ModalSubmitInteraction, type OverwriteResolvable, PermissionsBitField, type SelectMenuComponentOptionData, StringSelectMenuBuilder, type StringSelectMenuInteraction, TextInputBuilder, TextInputStyle } from 'discord.js'
import { Ticket } from './ticket'

interface PanelTicketType {
  interaction: StringSelectMenuInteraction<CacheType> | ModalSubmitInteraction<CacheType> | ButtonInteraction<CacheType> | ChatInputCommandInteraction<CacheType>
}

export class TicketPanel {
  private readonly interaction
  constructor ({ interaction }: PanelTicketType) {
    this.interaction = interaction
  }

  async validator (): Promise<boolean> {
    const Constructor = new Ticket({ interaction: this.interaction })
    return await Constructor.validator()
  }

  async CreatePanel (): Promise<void> {
    const embed = new EmbedBuilder({
      description: '✅ | Painel membro aberto com sucesso, escolha uma das opções abaixo:'
    })

    const optionsMenu: SelectMenuComponentOptionData[] = [
      {
        emoji: { name: '🔊' },
        label: 'Criar call',
        value: 'CreateCall'
      },
      {
        emoji: { name: '👤' },
        label: 'Adicionar usuário',
        value: 'AddUser'
      },
      {
        emoji: { name: '🗑️' },
        label: 'Remover usuário',
        value: 'RemoveUser'
      },
      {
        emoji: { name: '💾' },
        label: 'Salvar logs',
        value: 'Transcript'
      }
    ]

    if (!await Discord.Permission(this.interaction, 'Administrator')) {
      optionsMenu.push(
        {
          emoji: { name: '🗑️' },
          label: 'Deletar ticket',
          value: 'delTicket'
        }
      )
    }

    const row = new ActionRowBuilder<StringSelectMenuBuilder>({
      components: [
        new StringSelectMenuBuilder({
          placeholder: 'Escolha uma opção!',
          customId: '-1_User_Ticket_PanelSelect',
          options: optionsMenu
        })
      ]
    })

    await this.interaction.editReply({
      embeds: [embed],
      components: [row]
    })
  }

  async CreateCall (): Promise<void> {
    if (!this.interaction.inCachedGuild()) return
    if (await this.validator()) return
    const { guild, guildId, channelId, user } = this.interaction
    const data = await db.tickets.get(`${guildId}.tickets.${channelId}`)
    const ticketConfig = await db.guilds.get(`${guildId}.config.ticket`)
    const name = `🔊-${data.owner}`
    const existCall = this.interaction.guild.channels.cache.find((voiceChannel) => voiceChannel.name === name)

    if (existCall !== undefined) {
      await this.interaction.editReply({
        embeds: [new EmbedBuilder({
          title: `❌ | Usuário ${user.displayName ?? user.username}, já tem um ticket, caso queira continuar, delete o ticket atual.`
        }).setColor('Red')],
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder({
          label: '🔗 Acessar Call',
          style: ButtonStyle.Link,
          url: existCall.url
        }))]
      })
      return
    }

    const allow = [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.AttachFiles,
      PermissionsBitField.Flags.AddReactions
    ]

    const permissionOverwrites = [
      {
        id: guild.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: user.id,
        allow
      },
      {
        id: data.owner,
        allow
      }
    ] as OverwriteResolvable[]

    if (ticketConfig?.role !== undefined) {
      permissionOverwrites.push({
        id: ticketConfig.role,
        allow
      })
    }

    const voiceChannel = await this.interaction.guild?.channels.create({
      name,
      permissionOverwrites,
      type: ChannelType.GuildVoice
    })

    await db.tickets.set(`${guildId}.tickets.${channelId}.voiceId`, voiceChannel.id)

    await this.interaction.deleteReply()
    await this.interaction.channel?.send({
      embeds: [new EmbedBuilder({
        title: '✅ | Call criada com sucesso!'
      }).setColor('Green')
      ],
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder({
        label: '🔗 Acessar Call',
        style: ButtonStyle.Link,
        url: voiceChannel.url
      }))]
    })
  }

  async AddUser (): Promise<void> {
    const interaction = this.interaction
    if (!interaction.isStringSelectMenu()) return

    const modal = new ModalBuilder({ customId: '-1_User_Ticket_AddUserModal', title: 'Adicione um usuário ao Ticket' })
    const input = new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder({
      customId: 'id',
      label: 'Id do usuário a ser adicionado',
      placeholder: 'Você pode usar /ticket add-user',
      style: TextInputStyle.Short,
      minLength: 8,
      required: true
    }))

    modal.setComponents(input)
    await interaction.showModal(modal)
  }

  async EditChannelCollector ({ userIdByCommand, remove }: { userIdByCommand?: string, remove?: boolean }): Promise<void> {
    const interaction = this.interaction
    let userId
    if (interaction.isModalSubmit()) userId = interaction.fields.getTextInputValue('id')
    if (interaction.isChatInputCommand()) userId = userIdByCommand

    if (userId === undefined) {
      await interaction.editReply({
        embeds: [new EmbedBuilder({
          title: '❌ Nenhum usuário especificado!'
        }).setColor('Red')]
      })
      return
    }

    const { channelId, guildId, user } = interaction
    if (interaction?.channelId === null) {
      await interaction.editReply({
        embeds: [new EmbedBuilder({
          title: '❌ Ocorreu um erro, channelId é undefined?!'
        }).setColor('Red')]
      })
      return
    }
    const userFetch = await interaction.client.users.fetch(userId)
    const channel = interaction.guild?.channels.cache.find((channel) => channel.id === interaction.channelId)
    const ticketConfig = await db.guilds.get(`${guildId}.config.ticket`)
    const ownerTicket = await db.tickets.get(`${guildId}.tickets.${channelId}.owner`)

    console.log(channel?.toJSON())

    if ((channel?.permissionsFor(userFetch)?.has(PermissionsBitField.Flags.ViewChannel)) ?? false) {
      await interaction.editReply({
        embeds: [new EmbedBuilder({
          title: `❌ Usuário ${userFetch.displayName}, já tem acesso ao Ticket!`
        }).setColor('Red')]
      })
      return
    }

    const users = await db.tickets.get(`${guildId}.tickets.${channelId}.users`) ?? []
    const newUsers: any[] = []

    const allow = [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.AttachFiles,
      PermissionsBitField.Flags.AddReactions
    ]

    const permissionOverwrites = [
      {
        id: guildId,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      { id: user.id, allow },
      { id: userId, allow },
      { id: ownerTicket, allow }
    ] as OverwriteResolvable[]

    if (ticketConfig?.role !== undefined) permissionOverwrites.push({ id: ticketConfig.role, allow })

    for (const user of users) {
      if (remove === true && user.id === userId) continue
      permissionOverwrites.push({ id: user.id, allow })
      newUsers.push(user)
    }

    await channel?.edit({ permissionOverwrites })
      .then(async () => {
        await db.tickets.set(`${guildId}.tickets.${channelId}.users`, newUsers ?? [])

        await interaction.deleteReply()
        if (remove === true) {
          await interaction.channel?.send({
            embeds: [new EmbedBuilder({
              title: `❗ Usuário ${userFetch.displayName} foi removido do Ticket.`,
              timestamp: new Date(),
              footer: { text: `Por: ${interaction.user.displayName} | ${interaction.user.id}`, iconURL: interaction.user?.avatarURL() ?? undefined }
            }).setColor('Red')]
          })
        } else {
          await interaction.channel?.send({
            embeds: [new EmbedBuilder({
              title: `✅ Usuário ${userFetch.displayName} foi adicionado ao Ticket!`,
              timestamp: new Date(),
              footer: { text: `Por: ${interaction.user.displayName} | ${interaction.user.id}`, iconURL: interaction.user?.avatarURL() ?? undefined }
            }).setColor('Green')]
          })
        }
      })
      .catch(async (err) => {
        console.log(err)
        await interaction.editReply({
          embeds: [new EmbedBuilder({
            title: '❌ Ocorreu um erro ao tentar alterar as permissões do channel!'
          }).setColor('Red')]
        })
      })
  }
}
