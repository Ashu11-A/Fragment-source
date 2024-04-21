import { db } from '@/app'
import { CustomButtonBuilder, Discord, createRow } from '@/functions'
import { ActionRowBuilder, ButtonBuilder, type ButtonInteraction, ButtonStyle, type CacheType, ChannelType, type CommandInteraction, ComponentType, EmbedBuilder, ModalBuilder, type ModalSubmitInteraction, type OverwriteResolvable, PermissionsBitField, type StringSelectMenuInteraction, type TextChannel, TextInputBuilder, TextInputStyle, codeBlock } from 'discord.js'
import { getModalData } from './getModalData'
import { buttonsUsers, ticketButtonsConfig } from './ticketUpdateConfig'

interface TicketType {
  interaction: CommandInteraction<CacheType> | ButtonInteraction<CacheType> | StringSelectMenuInteraction | ModalSubmitInteraction<CacheType>
}
export class TicketButtons implements TicketType {
  interaction
  constructor ({ interaction }: TicketType) {
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

  public async createTicket ({ title, description }: {
    title?: string
    description?: string
  }): Promise<void> {
    const { interaction } = this
    if (!interaction.inCachedGuild()) return
    const { guild, user, guildId } = interaction
    const nome = `🎫-${user.id}`
    const sendChannel = guild?.channels.cache.find((c) => c.name === nome)
    const status: Record<string, boolean | undefined> | null = await db.system.get(`${guild?.id}.status`)
    const ticketConfig = await db.guilds.get(`${guild?.id}.config.ticket`)
    const usageDay = await db.tickets.get(`${guildId}.use.${user.id}`) as { date: Date, usage: number } | undefined

    if (usageDay !== undefined) {
      const futureTime = new Date(usageDay.date)
      let muchRequest: boolean = false
      if (futureTime < new Date()) {
        await db.tickets.delete(`${guildId}.tickets.${user.id}`)
      } else if (usageDay.usage >= ticketConfig?.limit ?? 1) muchRequest = true
      if (muchRequest) {
        const futureTimeString = `<t:${Math.floor(futureTime.getTime() / 1000)}:f>`
        await this.interaction.editReply({
          embeds: [
            new EmbedBuilder({
              title: `❌ | Você já usou o limite diario de tickets (${usageDay.usage}/${ticketConfig?.limit}), por favor, não spame!`,
              fields: [
                { name: 'Tente novamente em:', value: futureTimeString }
              ]
            }).setColor('Red')
          ]
        })
        return
      }
    }

    if (sendChannel !== undefined) {
      await this.interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle(`Olá ${user.username}`)
            .setDescription('❌ | Você já possui um ticket aberto!')
            .setColor('Red')
        ],
        components: [
          await Discord.buttonRedirect({
            guildId,
            channelId: sendChannel.id,
            emoji: { name: '🎫' },
            label: 'Ir ao Ticket'
          })
        ]
      })
      return
    }

    if (status?.Ticket === false) {
      await this.interaction.editReply({ content: '❌ | Os tickets estão desativados no momento!' })
      return
    }

    try {
      const permissionOverwrites = [
        {
          id: guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.AttachFiles,
            PermissionsBitField.Flags.AddReactions
          ]
        }
      ] as OverwriteResolvable[]

      if (ticketConfig?.role !== undefined) {
        permissionOverwrites.push({
          id: ticketConfig.role,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.AttachFiles,
            PermissionsBitField.Flags.AddReactions
          ]
        })
      }

      /* Cria o chat do Ticket */
      const category = guild.channels.cache.find(category => category.type === ChannelType.GuildCategory && category.id === ticketConfig?.category)
      const ch = await guild.channels.create({
        name: `🎫-${user.id}`,
        type: ChannelType.GuildText,
        topic: `Ticket do(a) ${user.username}, ID: ${user.id}`,
        permissionOverwrites,
        parent: category?.id
      })

      await this.interaction.editReply({
        embeds: [
          new EmbedBuilder({
            title: `Olá ${user.username}`,
            description: '✅ | Seu ticket foi criado com sucesso!'
          }).setColor('Green')
        ],
        components: [
          await Discord.buttonRedirect({
            guildId,
            channelId: ch?.id,
            emoji: { name: '🎫' },
            label: 'Ir ao Ticket'
          })
        ]
      })
      const embed = new EmbedBuilder({
        title: `👋 Olá ${interaction.user.displayName}, boas vindas ao seu ticket.`,
        footer: { text: `Equipe ${guild?.name} | ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`, iconURL: (guild?.iconURL({ size: 64 }) ?? undefined) }
      })

      if (title !== undefined) embed.addFields({ name: '📃 Motivo:', value: codeBlock(title) })
      if (description !== undefined) embed.addFields({ name: '📭 Descrição:', value: codeBlock(description) })

      const botao = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new CustomButtonBuilder({
          type: 'Ticket',
          permission: 'User',
          customId: 'delTicket',
          label: 'Fechar',
          emoji: { name: '🔒' },
          style: ButtonStyle.Danger
        }),
        new CustomButtonBuilder({
          type: 'Ticket',
          permission: 'User',
          customId: 'Panel',
          label: 'Painel',
          emoji: { name: '🖥️' },
          style: ButtonStyle.Success
        }),
        new CustomButtonBuilder({
          type: 'Ticket',
          permission: 'User',
          customId: 'PanelCart',
          label: 'Painel vendas',
          emoji: { name: '🛒' },
          style: ButtonStyle.Primary
        })
      )
      if (ticketConfig?.role !== undefined) {
        await ch?.send({ content: `<@&${ticketConfig.role}>`, embeds: [embed], components: [botao] }).catch(console.error)
      } else {
        await ch?.send({ embeds: [embed], components: [botao] }).catch(console.error)
      }
      const date = new Date().setDate(new Date().getDate() + 1)
      const getUsage = await db.tickets.get(`${guildId}.use.${user.id}`)
      await db.tickets.set(`${guildId}.use.${user.id}`, { date, usage: getUsage?.usage !== undefined ? getUsage.usage + 1 : 1 })
      await db.tickets.set(`${guildId}.tickets.${ch.id}`, {
        owner: interaction.user.id
      })
    } catch (all) {
      console.error(all)
      const channel = interaction.guild.channels.cache.find(channel => channel.name === `🎫-${user.id}`)
      if (channel !== undefined) await channel.delete()
      await this.interaction.editReply({
        content: '❗️ Ocorreu um erro interno, tente mais tarde.'
      })
    }
  }

  async OpenModal (): Promise<void> {
    const interaction = this.interaction
    if (interaction.isModalSubmit()) return

    const modal = new ModalBuilder({ customId: '-1_User_Ticket_OpenModalCollector', title: 'Abrir novo ticket' })
    modal.components.push(
      new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder({
        customId: 'title',
        label: 'Qual é o motivo do ticket?',
        required,
        maxLength: 150,
        style: TextInputStyle.Short,
        placeholder: 'Dúvida... Denúncia... Pedido...'
      })),
      new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder({
        customId: 'description',
        label: 'Qual a descrição?',
        required: false,
        maxLength: 255,
        style: TextInputStyle.Paragraph,
        placeholder: 'Queria saber mais informações sobre...'
      }))
    )
    await interaction.showModal(modal)
  }

  public async setSystem (options: {
    type: 'select' | 'button' | 'modal'
  }): Promise<void> {
    if (!this.interaction.isButton()) return
    const { guildId, message, channelId } = this.interaction
    const { type } = options

    await db.messages.set(`${guildId}.ticket.${channelId}.messages.${message.id}.properties.SetSelect`, type === 'select')
    await db.messages.set(`${guildId}.ticket.${channelId}.messages.${message.id}.properties.SetButton`, type === 'button')
    await db.messages.set(`${guildId}.ticket.${channelId}.messages.${message.id}.properties.SetModal`, type === 'modal')
    await this.interaction.editReply({ content: '⏱️ | Aguarde só um pouco...' })
    await ticketButtonsConfig(this.interaction, message)
  }

  public async sendSave (key: string): Promise<void> {
    const { guild, guildId, channelId } = this.interaction
    const { label, maxLength, placeholder, style, title, type, db: dataDB } = getModalData(key)

    if (this.interaction.isButton()) {
      try {
        const { message, customId } = this.interaction
        const { embedChannelID: channelEmbedID, embedMessageID: messageID } = await db.messages.get(`${guildId}.ticket.${channelId}.messages.${message?.id}`)
        const channel = guild?.channels.cache.get(channelEmbedID) as TextChannel
        const msg = await channel?.messages.fetch(messageID)

        if (typeof channelEmbedID === 'string' && messageID !== undefined) {
          await buttonsUsers(this.interaction, message.id, msg)
        } else {
          const textValue = await db.messages.get(`${guildId}.ticket.${channelId}.messages.${message.id}.${dataDB}`)
          const modal = new ModalBuilder({ customId, title })
          const content = new ActionRowBuilder<TextInputBuilder>({
            components: [
              new TextInputBuilder({
                custom_id: 'content',
                label,
                placeholder,
                value: textValue ?? null,
                style,
                required: true,
                maxLength,
                type
              })
            ]
          })
          modal.setComponents(content)
          await this.interaction.showModal(modal)
        }
      } catch (err) {
        console.log(err)
        await this.interaction.editReply({ content: '❌ | Ocorreu um erro, tente mais tarde!' })
      }
    }
  }

  public async delete (options: {
    type: 'delTicket' | 'EmbedDelete'
  }): Promise<void> {
    const { type } = options
    const interaction = this.interaction
    if (!interaction.inCachedGuild()) return
    if (await this.validator()) return
    if (await Discord.Permission(interaction, 'Administrator')) return

    const { guild, guildId, channelId, user } = interaction
    const embed = new EmbedBuilder()
      .setColor('Gold')
    if (type === 'delTicket') {
      embed.setDescription('Tem certeza que deseja fechar o Ticket?')
    } else {
      embed.setDescription('Tem certeza que deseja deletar esse templete de Ticket?\nIsso irá deletar as informações do Banco de dados e Embeds.')
    }

    const messagePrimary = await this.interaction.editReply({
      embeds: [embed],
      components: [createRow(
        new ButtonBuilder({ customId: 'embed-confirm-button', label: 'Confirmar', style: ButtonStyle.Success }),
        new ButtonBuilder({ customId: 'embed-cancel-button', label: 'Cancelar', style: ButtonStyle.Danger })
      )]
    })
    const collector = messagePrimary.createMessageComponentCollector({ componentType: ComponentType.Button })
    collector.on('collect', async (subInteraction) => {
      collector.stop()
      const clearData = { components: [], embeds: [] }

      if (subInteraction.customId === 'embed-cancel-button') {
        await subInteraction.update({
          ...clearData,
          embeds: [
            new EmbedBuilder()
              .setDescription('Você cancelou a ação')
              .setColor('Green')
          ]
        })
      } else if (subInteraction.customId === 'embed-confirm-button') {
        const embed = new EmbedBuilder()
          .setColor('Red')
        if (type === 'delTicket') {
          embed
            .setTitle(`👋 | Olá ${user.username}`)
            .setDescription('❗️ | Esse ticket será excluído em 5 segundos.')
        } else {
          embed
            .setDescription('Deletando Banco de dados e Mensagens...')
        }
        await subInteraction.update({
          ...clearData,
          embeds: [embed]
        })
        if (type === 'delTicket') {
          const tickets = await db.tickets.get(`${guild.id}.tickets`) as Record<string, { voiceId: string }>
          setTimeout(() => {
            subInteraction.channel?.delete().catch(console.error)
            const ticket = tickets[subInteraction.channelId]

            if (ticket !== undefined) interaction.guild.channels.cache.find((channel) => channel.id === ticket.voiceId)?.delete().catch(console.error)
          }, 5000)
          await db.tickets.delete(`${guildId}.tickets.${subInteraction.channelId}`)
        } else if (interaction.isButton()) {
          const { embedChannelID: channelEmbedID, embedMessageID: messageID } = await db.messages.get(`${guildId}.ticket.${channelId}.messages.${interaction.message?.id}`)

          if (channelEmbedID !== undefined || messageID !== undefined) {
            try {
              const channel = guild?.channels.cache.get(channelEmbedID) as TextChannel
              const msg = await channel?.messages.fetch(messageID)
              await msg.delete()
            } catch (err) {
              console.log(err)
            }
          }

          await db.messages.delete(`${guildId}.ticket.${channelId}.messages.${interaction.message?.id}`)
          await interaction.message?.delete()
        }
      }
    })
  }
}
