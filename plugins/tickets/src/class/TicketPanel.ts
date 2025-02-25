import { database } from '@/utils/database.js'
import { Error, ModalBuilder, StringSelectMenuBuilder } from 'discord'
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChannelType, CommandInteraction, EmbedBuilder, ModalSubmitInteraction, type SelectMenuComponentOptionData, StringSelectMenuInteraction, TextInputBuilder, TextInputStyle } from 'discord.js'
import { TicketBuilder } from './TicketBuilder.js'

type Interaction = CommandInteraction<'cached'> | ModalSubmitInteraction<'cached'> | ButtonInteraction<'cached'> | StringSelectMenuInteraction<'cached'>

export class TicketPanel {
  private readonly interaction
  constructor ({ interaction }: { interaction: Interaction }) {
    this.interaction = interaction
  }

  async validator (): Promise<boolean> {
    const { channelId } = this.interaction
    const ticketData = channelId !== null ? await database.ticket.findOne({ where: { channelId } }) : null
    if (ticketData === null) {
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

    if (this.interaction.memberPermissions?.has('Administrator')) {
      optionsMenu.push(
        {
          emoji: { name: '🗑️' },
          label: 'Deletar ticket',
          value: 'Delete'
        }
      )
    }

    const row = new ActionRowBuilder<StringSelectMenuBuilder>({
      components: [
        new StringSelectMenuBuilder({
          placeholder: 'Escolha uma opção!',
          customId: 'PanelSelect',
          options: optionsMenu
        })
      ]
    })

    await this.interaction.editReply({ embeds: [embed], components: [row] })
  }

  async CreateCall (): Promise<void> {
    const { guild, channelId } = this.interaction

    if (!this.interaction.inCachedGuild()) return
    if (await this.validator() || channelId === null) return

    const ticketData = await database.ticket.findOne({ where: { channelId } })
    if (ticketData === null) return await new Error({ element: 'ticket', interaction: this.interaction }).reply()
    const { ownerId, category: { title }, voice } = ticketData
    const existCall = await this.interaction.guild.channels.fetch(voice?.id).catch(() => undefined)
    const userOwner = await this.interaction.client.users.fetch(ownerId).catch(() => undefined)

    /* Cria o chat do Ticket */
    const category = (await guild.channels.fetch()).find((channel) => channel?.type === ChannelType.GuildCategory && channel.name === title)
    ?? await guild.channels.create({
      name: title,
      type: ChannelType.GuildCategory
    })

    if (existCall !== undefined && existCall !== null && existCall.type === ChannelType.GuildVoice) {
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

    const permissionOverwrites = new TicketBuilder({ interaction: this.interaction }).setData(ticketData).permissions()

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
      await new TicketBuilder({ interaction: this.interaction })
        .setData(ticketData)
        .setVoice({ 
          id: voiceChannel.id,
          messageId: message.id
        })
        .edit()
    })
  }

  async AddUser (): Promise<void> {
    const interaction = this.interaction
    if (!interaction.isStringSelectMenu()) return

    const modal = new ModalBuilder({ customId: 'AddUserModal', title: 'Adicione um usuário ao Ticket' })
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
    const { channelId } = this.interaction
    if (channelId === null) return
    const ticketData = await database.ticket.findOne({ where: { channelId } })
    if (ticketData === null) return await new Error({ element: 'ticket', interaction: this.interaction }).reply()

    if ((ticketData?.users ?? [])?.length === 0) {
      await this.interaction.editReply({
        embeds: [new EmbedBuilder({
          title: '❌ | Não existem usuários adicionados ao ticket!'
        }).setColor('Red')]
      })
      return
    }

    const options: SelectMenuComponentOptionData[] = []

    for (const user of (ticketData?.users ?? [])) {
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

  // async EditChannelCollector (): Promise<void> {
  //   const interaction = this.interaction
  //   if (!interaction.isModalSubmit()) return
  //   const userId = interaction.fields.getTextInputValue('id')
  //   const Constructor = new Ticket({ interaction })
  //   const { channelId } = interaction

  //   if (userId === undefined) {
  //     await interaction.editReply({
  //       embeds: [new EmbedBuilder({
  //         title: '❌ Nenhum usuário especificado!'
  //       }).setColor('Red')]
  //     })
  //     return
  //   }
  //   if (channelId === null) {
  //     await interaction.editReply({
  //       embeds: [new EmbedBuilder({
  //         title: '❌ Ocorreu um erro, channelId é undefined?!'
  //       }).setColor('Red')]
  //     })
  //     return
  //   }
  //   await Constructor.Permissions({ userId, channelId })
  // }
}
