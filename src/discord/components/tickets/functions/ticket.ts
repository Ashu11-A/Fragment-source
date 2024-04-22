import { db } from '@/app'
import { createRow, CustomButtonBuilder, Discord } from '@/functions'
import { type TicketConfig } from '@/interfaces/Ticket'
import { ActionRowBuilder, ButtonBuilder, type ButtonInteraction, ButtonStyle, type CacheType, ChannelType, type ChatInputCommandInteraction, codeBlock, ComponentType, EmbedBuilder, type GuildBasedChannel, type ModalSubmitInteraction, type OverwriteResolvable, PermissionsBitField, type StringSelectMenuInteraction, type TextChannel } from 'discord.js'

interface TicketType {
  interaction: StringSelectMenuInteraction<CacheType> | ModalSubmitInteraction<CacheType> | ButtonInteraction<CacheType> | ChatInputCommandInteraction<CacheType>
}

export class Ticket {
  private readonly interaction
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

  public async create ({ title, description, categoryName = 'Tickets' }: {
    title?: string
    description?: string
    categoryName?: string
  }): Promise<void> {
    const { interaction } = this
    if (!interaction.inCachedGuild()) return
    const { guild, user, guildId } = interaction
    const nome = `🎫-${user.id}`
    const sendChannel = guild?.channels.cache.find((c) => c.name === nome)
    const status: Record<string, boolean | undefined> | null = await db.system.get(`${guild?.id}.status`)
    const ticketConfig = await db.guilds.get(`${guild?.id}.config.ticket`) as TicketConfig
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

      /* Cria o chat do Ticket */
      let category: GuildBasedChannel | undefined
      category = guild.channels.cache.find(category => category.type === ChannelType.GuildCategory && category.name === categoryName)
      if (category === undefined) {
        category = await guild.channels.create({
          name: categoryName,
          type: ChannelType.GuildCategory
        })
      }

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
      await ch?.send({ embeds: [embed], components: [botao] }).catch(console.error)
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

  async PanelCategory (): Promise<void> {
    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents([
      new CustomButtonBuilder({
        permission: 'Admin',
        type: 'Ticket',
        customId: 'AddCategory',
        label: 'Adicionar',
        emoji: { name: '➕' },
        style: ButtonStyle.Success
      }),
      new CustomButtonBuilder({
        permission: 'Admin',
        type: 'Ticket',
        customId: 'RemCategory',
        label: 'Remover',
        emoji: { name: '➖' },
        style: ButtonStyle.Danger
      })
    ])

    const embed = new EmbedBuilder({
      title: '🗂️ Gerenciar categorias dos tickets.',
      description: 'Essas categorias são para classificar os tickets quando abertos pelos usuários'
    })

    await this.interaction.editReply({
      embeds: [embed],
      components: [buttons]
    })
  }
}
