import { db } from '@/app'
import { Discord } from '@/functions'
import { ActionRowBuilder, ButtonBuilder, type ButtonInteraction, ButtonStyle, type CacheType, ChannelType, type ChatInputCommandInteraction, EmbedBuilder, type GuildBasedChannel, ModalBuilder, type ModalSubmitInteraction, type OverwriteResolvable, PermissionsBitField, type SelectMenuComponentOptionData, StringSelectMenuBuilder, type StringSelectMenuInteraction, TextInputBuilder, TextInputStyle } from 'discord.js'
import { Ticket } from './ticket'
import { type Ticket as TicketDBType } from '@/interfaces/Ticket'

interface PanelTicketType {
  interaction: StringSelectMenuInteraction<CacheType> | ModalSubmitInteraction<CacheType> | ButtonInteraction<CacheType> | ChatInputCommandInteraction<CacheType>
}

export class TicketPanel {
  private readonly interaction
  constructor ({ interaction }: PanelTicketType) {
    this.interaction = interaction
  }

  async validator (): Promise<boolean> {
    const { guildId, channelId } = this.interaction
    if (await db.tickets.get(`${guildId}.tickets.${channelId}`) === null) {
      await this.interaction.editReply({
        embeds: [new EmbedBuilder({
          title: '⚠️ Atenção, você não está em um ticket, tente usar esse comando apenas em tickets!'
        }).setColor('Red')]
      })
      return true
    }
    return false
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
    const { owner, category: { title }, voice } = await db.tickets.get(`${guildId}.tickets.${channelId}`) as TicketDBType
    const existCall = this.interaction.guild.channels.cache.find((voiceChannel) => voiceChannel.id === voice?.id)
    const userOwner = this.interaction.client.users.cache.find((user) => user.id === owner)

    /* Cria o chat do Ticket */
    let category: GuildBasedChannel | undefined
    category = guild.channels.cache.find(category => category.type === ChannelType.GuildCategory && category.name === title)
    if (category === undefined) {
      category = await guild.channels.create({
        name: 'Tickets',
        type: ChannelType.GuildCategory
      })
    }

    if (existCall !== undefined) {
      await this.interaction.editReply({
        embeds: [new EmbedBuilder({
          title: '❌ | Já existe uma call para esse ticket.'
        }).setColor('Red')],
        components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder({
          label: '🔗 Acessar call',
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
        id: owner,
        allow
      }
    ] as OverwriteResolvable[]

    const voiceChannel = await this.interaction.guild?.channels.create({
      name: `🔊・${userOwner?.username}`,
      permissionOverwrites,
      type: ChannelType.GuildVoice,
      parent: category.id
    })

    await this.interaction.deleteReply()
    await this.interaction.channel?.send({
      embeds: [new EmbedBuilder({
        title: '✅ | Call criada com sucesso!'
      }).setColor('Green')
      ],
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder({
        label: '🔗 Acessar call',
        style: ButtonStyle.Link,
        url: voiceChannel.url
      }))]
    }).then(async (message) => {
      await db.tickets.set(`${guildId}.tickets.${channelId}.voice`, {
        id: voiceChannel.id,
        messageId: message.id
      })
    })
  }

  async AddUser (): Promise<void> {
    const interaction = this.interaction
    if (!interaction.isStringSelectMenu()) return

    const modal = new ModalBuilder({ customId: '-1_User_Ticket_AddUserModal', title: 'Adicione um usuário ao Ticket' })
    const input = new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder({
      customId: 'id',
      label: 'Id do usuário a ser adicionado',
      placeholder: 'Você pode usar /ticket manage add-user',
      style: TextInputStyle.Short,
      minLength: 8,
      required: true
    }))

    modal.setComponents(input)
    await interaction.showModal(modal)
  }

  async RemoveUser (): Promise<void> {
    const { guildId, channelId } = this.interaction
    const { users } = await db.tickets.get(`${guildId}.tickets.${channelId}`) as TicketDBType

    if ((users ?? [])?.length === 0) {
      await this.interaction.editReply({
        embeds: [new EmbedBuilder({
          title: '❌ | Não existem usuários adicionados ao ticket!'
        }).setColor('Red')]
      })
      return
    }

    const options: SelectMenuComponentOptionData[] = []

    for (const user of (users ?? [])) {
      if (typeof options.find((option) => option.value === user.id) === 'object') continue
      options.push({
        label: user.displayName,
        value: user.id
      })
    }

    const row = new ActionRowBuilder<StringSelectMenuBuilder>({
      components: [new StringSelectMenuBuilder({
        customId: '-1_Admin_Ticket_RemoveUser',
        placeholder: 'Selecione os usuários que deseja remover',
        minValues: 1,
        maxValues: options.length,
        options
      })]
    })

    await this.interaction.editReply({ components: [row] })
  }

  async EditChannelCollector (): Promise<void> {
    const interaction = this.interaction
    if (!interaction.isModalSubmit()) return
    const userId = interaction.fields.getTextInputValue('id')
    const Constructor = new Ticket({ interaction })
    const { channelId } = interaction

    if (userId === undefined) {
      await interaction.editReply({
        embeds: [new EmbedBuilder({
          title: '❌ Nenhum usuário especificado!'
        }).setColor('Red')]
      })
      return
    }
    if (channelId === null) {
      await interaction.editReply({
        embeds: [new EmbedBuilder({
          title: '❌ Ocorreu um erro, channelId é undefined?!'
        }).setColor('Red')]
      })
      return
    }
    await Constructor.Permissions({ userId, channelId })
  }
}
