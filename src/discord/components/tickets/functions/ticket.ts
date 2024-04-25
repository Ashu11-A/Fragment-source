import { core, db } from '@/app'
import { createRow, CustomButtonBuilder, delay, Discord } from '@/functions'
import { type TicketConfig, type Ticket as TicketDBType } from '@/interfaces/Ticket'
import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, type ButtonInteraction, ButtonStyle, type CacheType, ChannelType, type ChatInputCommandInteraction, codeBlock, ComponentType, EmbedBuilder, type GuildBasedChannel, type ModalSubmitInteraction, type OverwriteResolvable, PermissionsBitField, type StringSelectMenuInteraction, type TextChannel } from 'discord.js'
import { TicketClaim } from './claim'
import { ticketButtonsConfig } from './ticketUpdateConfig'

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

  public async create ({ title, description, categoryEmoji = '🎫', categoryName = 'Tickets' }: {
    title?: string
    description?: string
    categoryEmoji?: string
    categoryName?: string
  }): Promise<void> {
    const { interaction } = this
    if (!interaction.inCachedGuild()) return
    const { guild, user, guildId } = interaction
    const nome = `${categoryEmoji}-${user.id}`
    const claimConstructor = new TicketClaim({ interaction })
    const sendChannel = guild?.channels.cache.find((c) => c.name === nome)
    const status: Record<string, boolean | undefined> | null = await db.system.get(`${guild?.id}.status`)
    const ticketConfig = await db.guilds.get(`${guild?.id}.config.ticket`) as TicketConfig
    const usageDay = await db.tickets.get(`${guildId}.users.${user.id}.usage`) as { date: Date, usage: number } | undefined

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
        name: `${categoryEmoji}・${user.username}`,
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
            channelId: ch.id,
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
          disabled: true,
          style: ButtonStyle.Primary
        })
      )
      await ch.send({ embeds: [embed], components: [botao] })
      const date = new Date().setDate(new Date().getDate() + 1)
      const getUsage = await db.tickets.get(`${guildId}.users.${user.id}.usage`)
      await db.tickets.set(`${guildId}.users.${user.id}.usage`, { date, usage: getUsage?.usage !== undefined ? getUsage.usage + 1 : 1 })
      await db.tickets.set(`${guildId}.tickets.${ch.id}`, {
        owner: interaction.user.id,
        description,
        channelId: ch.id,
        category: {
          title: categoryName,
          emoji: categoryEmoji
        },
        createAt: Date.now()
      })
      await claimConstructor.create({ channelId: ch.id })
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
    channelId?: string // Apenas se for deletar algo que está fora do channel
  }): Promise<void> {
    const { type, channelId: channelDel } = options
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
        const now = new Date()
        const futureTime = new Date(now.getTime() + 15000)
        const futureTimeString = `<t:${Math.floor(futureTime.getTime() / 1000)}:R>`
        const embed = new EmbedBuilder().setColor('Red')

        if (type === 'delTicket') {
          embed
            .setTitle(`👋 | Olá ${user.username}`)
            .setDescription(`❗️ | Esse ticket será excluído em ${futureTimeString} segundos.`)
        } else {
          embed.setDescription('Deletando Banco de dados e Mensagens...')
        }
        await subInteraction.update({
          ...clearData,
          embeds: [embed]
        })
        if (type === 'delTicket') {
          const tickets = await db.tickets.get(`${guild.id}.tickets`) as Record<string, TicketDBType> ?? []
          const ticket = tickets[channelDel ?? subInteraction.channelId]
          const channel = guild.channels.cache.find((channel) => channel.id === ticket?.channelId) as TextChannel

          await delay(5000)

          channel.delete()
            .then(async () => {
              /* Apagar as mensagens atrelasdas ao ticket */
              for (const { channelId, messageId } of ticket.messages) {
                const channel = interaction.guild.channels.cache.find((channel) => channel.id === channelId) as TextChannel | undefined
                if (channel === undefined) continue

                await channel.messages.fetch(messageId).then(async (message) => {
                  await message.delete()
                })
              }
              if (ticket !== undefined) {
                const voiceChannel = interaction.guild.channels.cache.find((channel) => channel.id === ticket.voice?.id)
                if (voiceChannel !== undefined) voiceChannel.delete().catch(console.error)
              }
              await db.tickets.delete(`${guildId}.tickets.${subInteraction.channelId}`)
            })
            .catch(async (err) => {
              console.log(err)
              await subInteraction.update({
                ...clearData,
                embeds: [new EmbedBuilder({
                  title: 'Ocorreu um erro ao tentar deletar o ticket!'
                }).setColor('Red')]
              })
            })
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
    const interaction = this.interaction
    if (!interaction.isButton()) return
    const { guildId, channelId, message } = interaction
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
    }).then(async () => {
      await db.messages.set(`${guildId}.ticket.${channelId}.messages.${message?.id}.properties.EmbedCategory`, true)
      await ticketButtonsConfig({ interaction: this.interaction, confirm: false })
    })
  }

  async Permissions ({ userId, channelId, remove = false, memberTeam = false }: { userId: string, channelId: string, remove?: boolean, memberTeam?: boolean }): Promise<boolean> {
    const interaction = this.interaction
    const { guildId, user } = interaction
    const userFetch = await interaction.client.users.fetch(userId)
    const channel = interaction.guild?.channels.cache.find((channel) => channel.id === channelId) as TextChannel

    if (channel === undefined) {
      await interaction.editReply({
        embeds: [new EmbedBuilder({
          title: '❌ Esse ticket não existe para o bot!'
        }).setColor('Red')]
      })
      return true
    }

    const { owner, channelId: channelTicket } = await db.tickets.get(`${guildId}.tickets.${channelId}`) as TicketDBType

    if ((channel.permissionsFor(userFetch)?.has(PermissionsBitField.Flags.ViewChannel) ?? false) && !remove) {
      await interaction.editReply({
        embeds: [new EmbedBuilder({
          title: user.id === userId ? '❌ | Você já está atendendo este ticket!' : `❌ Usuário ${userFetch.displayName} já tem acesso ao Ticket!`
        }).setColor('Red')],
        components: [await Discord.buttonRedirect({
          guildId,
          channelId,
          emoji: { name: '🎫' },
          label: 'Ir ao Ticket'
        })]
      })
      return true
    }

    const { users, team } = await db.tickets.get(`${guildId}.tickets.${channelId}`) as TicketDBType ?? []
    const PermUsers: any[] = []
    const PermTeamMember: any[] = []

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
      { id: owner, allow }
    ] as OverwriteResolvable[]

    if (users !== undefined) {
      for (const user of users) {
        if (remove && user.id === userId) continue
        permissionOverwrites.push({ id: user.id, allow })
        PermUsers.push(user)
      }
    }
    if (team !== undefined) {
      for (const user of team) {
        if (remove && user.id === userId) continue
        permissionOverwrites.push({ id: user.id, allow })
        PermTeamMember.push(user)
      }
    }

    if (!remove) {
      permissionOverwrites.push({ id: userFetch.id, allow })
      PermUsers.push({ name: userFetch.username, displayName: userFetch.displayName, id: userFetch.id })
    }

    console.log(PermTeamMember, PermUsers)

    return await channel.edit({ permissionOverwrites })
      .then(async () => {
        await db.tickets.set(`${guildId}.tickets.${channelId}.users`, PermUsers)
        await db.tickets.set(`${guildId}.tickets.${channelId}.team`, PermTeamMember)
        core.info(`Usuário ${userFetch.displayName}, adicionado ao ticket: ${channelTicket}`)

        await interaction.deleteReply()
        if (remove) {
          await channel.send({
            embeds: [new EmbedBuilder({
              title: `❗ Usuário ${userFetch.displayName} foi removido do Ticket.`,
              timestamp: new Date(),
              footer: { text: `Por: ${interaction.user.displayName} | ${interaction.user.id}`, iconURL: interaction.user?.avatarURL() ?? undefined }
            }).setColor('Red')]
          })
        } else {
          if (memberTeam) {
            await channel.send({
              embeds: [new EmbedBuilder({
                title: `Usuário ${user.displayName}, reivindicou o ticket!`
              }).setColor('Green')]
            })
          } else {
            await channel.send({
              embeds: [new EmbedBuilder({
                title: `✅ Usuário ${userFetch.displayName} foi adicionado ao Ticket!`,
                timestamp: new Date(),
                footer: { text: `Por: ${interaction.user.displayName} | ${interaction.user.id}`, iconURL: interaction.user?.avatarURL() ?? undefined }
              }).setColor('Green')]
            })
          }
        }
        return false
      })
      .catch(async (err) => {
        console.log(err)
        await interaction.editReply({
          embeds: [new EmbedBuilder({
            title: '❌ Ocorreu um erro ao tentar alterar as permissões do channel!'
          }).setColor('Red')]
        })
        return true
      })
  }

  async Transcript ({ channelId }: { channelId: string }): Promise<void> {
    const { guildId, client } = this.interaction
    const ticket = await db.tickets.get(`${guildId}.tickets.${channelId}`) as TicketDBType
    const teamUser = client.users.cache.find((user) => user.id === ticket.team?.[0].id)
    const user = client.users.cache.find((user) => user.id === ticket.owner)

    console.log(ticket)

    const embed = new EmbedBuilder({
      title: '📄 Historico do ticket',
      fields: [
        { name: '🧑🏻‍💻 Usuário:', value: codeBlock(user?.displayName ?? 'Saiu do servidor...'), inline },
        { name: '🪪 ID:', value: codeBlock(ticket.owner), inline },

        { name: '\u200E', value: '\u200E', inline },

        { name: '🤝 Claim:', value: codeBlock(teamUser?.displayName ?? 'Ninguém reivindicou o ticket'), inline },
        { name: '🪪 ID:', value: codeBlock(teamUser?.id ?? 'None'), inline },

        { name: '\u200E', value: '\u200E', inline },

        { name: '❓ Motivo:', value: codeBlock(ticket.category.title), inline },
        { name: '📃 Descrição:', value: codeBlock(ticket?.description ?? 'Nada foi dito'), inline },

        { name: '\u200E', value: '\u200E', inline },

        { name: '🔎 Ticket ID:', value: codeBlock(ticket.channelId), inline },
        { name: '🤝 Convidados:', value: codeBlock(ticket.users?.map((user) => user.displayName)?.join(', ') ?? 'Não houve convidados!'), inline },
        { name: '\u200E', value: '\u200E', inline },

        { name: '📅 Data:', value: codeBlock(new Date(ticket.createAt).toLocaleString()), inline },
        { name: '\u200E', value: '\u200E', inline },
        { name: '\u200E', value: '\u200E', inline }
      ]
    })

    const files: AttachmentBuilder[] = []

    let text = ''

    for (const message of (ticket.history ?? [])) {
      if (message === undefined) continue
      text += `[${message.role} - ${new Date(message.date).toLocaleString()}] ${message.deleted ? '{{ DELETED }} ' : ''}\n${message.user.name}: ${message.message.content}\n\n`
    }

    files.push(
      new AttachmentBuilder(Buffer.from(text === '' ? 'Nenhuma conversa...' : text), { name: `${ticket.owner}.log`, description: `Transcript do usuário ${user?.displayName ?? ticket.owner}` })
    )
    files.push(
      new AttachmentBuilder(Buffer.from(JSON.stringify(ticket.history ?? { aviso: 'Nenhuma mensagem enviada!' }, null, 4)), { name: `${ticket.owner}.json`, description: `Transcript do usuário ${user?.displayName ?? ticket.owner}` })
    )

    await this.interaction.editReply({
      embeds: [embed],
      files
    })
  }
}
