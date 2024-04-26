import { db } from '@/app'
import { createRow, CustomButtonBuilder, delay, Discord } from '@/functions'
import { type Claim, type TicketConfig, type Ticket as TicketDBType, type User } from '@/interfaces/Ticket'
import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, type ButtonInteraction, ButtonStyle, type CacheType, ChannelType, type ChatInputCommandInteraction, codeBlock, ComponentType, EmbedBuilder, type GuildBasedChannel, type ModalSubmitInteraction, type OverwriteResolvable, PermissionsBitField, type StringSelectMenuInteraction, TextChannel } from 'discord.js'
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
    const claimConstructor = new TicketClaim({ interaction })
    const status: Record<string, boolean | undefined> | null = await db.system.get(`${guild?.id}.status`)
    const ticketConfig = await db.guilds.get(`${guild?.id}.config.ticket`) as TicketConfig
    const usageDay = await db.tickets.get(`${guildId}.users.${user.id}.usage`) as { date: Date, usage: number } | undefined

    if (usageDay !== undefined) {
      const futureTime = new Date(usageDay.date)
      let muchRequest: boolean = false
      if (futureTime < new Date()) {
        await db.tickets.delete(`${guildId}.tickets.${user.id}`)
      } else if (usageDay.usage >= (ticketConfig?.limit ?? 999)) muchRequest = true
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
            PermissionsBitField.Flags.AddReactions,
            PermissionsBitField.Flags.ReadMessageHistory
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

      const message = await ch.send({ embeds: [embed], components: [this.buttons({ isOpen: true })] })
      await db.tickets.set(`${guildId}.tickets.${ch.id}`, {
        owner: interaction.user.id,
        channelId: ch.id,
        messageId: message.id,
        closed: false,
        team: [],
        users: [],
        history: [],
        messages: [],
        description,
        category: {
          title: categoryName,
          emoji: categoryEmoji
        },
        createAt: Date.now()
      } satisfies TicketDBType)

      const claimMessage = await claimConstructor.create({ channelId: ch.id })

      if (claimMessage === undefined) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder({
              title: '❌ Ocorreu em erro ao enviar a embed de claim!'
            }).setColor('Random')
          ]
        })
        await ch.delete()
        await db.tickets.delete(`${guildId}.tickets.${ch.id}`)
        return
      }

      const date = new Date().setDate(new Date().getDate() + 1)
      const getUsage = await db.tickets.get(`${guildId}.users.${user.id}.usage`)

      await db.tickets.set(`${guildId}.users.${user.id}.usage`, { date, usage: getUsage?.usage !== undefined ? getUsage.usage + 1 : 1 })
      await db.tickets.set(`${guildId}.tickets.${ch.id}.claim`, {
        channelId: claimMessage.channelId,
        messageId: claimMessage.id
      } satisfies Claim)
      await db.tickets.push(`${guildId}.tickets.${ch.id}.messages`, { channelId: claimMessage?.channelId, messageId: claimMessage?.id })
    } catch (all) {
      console.error(all)
      const channel = interaction.guild.channels.cache.find(channel => channel.name === `🎫-${user.id}`)
      if (channel !== undefined) await channel.delete()
      await this.interaction.editReply({
        content: '❗️ Ocorreu um erro interno, tente mais tarde.'
      })
    }
  }

  async edit ({ channelId, messageId }: { channelId: string, messageId: string }): Promise<TextChannel | undefined> {
    const { guild, guildId } = this.interaction
    const ticket = await db.tickets.get(`${guildId}.tickets.${channelId}`) as TicketDBType
    const channel = await guild?.channels.fetch(channelId)

    if (!(channel instanceof TextChannel)) {
      await this.interaction.editReply({
        embeds: [new EmbedBuilder({
          title: '❌ Não consegui achar o ticket!'
        }).setColor('Red')]
      })
      return
    }

    const message = await channel.messages.fetch(messageId).catch(() => undefined)

    if (message === undefined) {
      await this.interaction.editReply({
        embeds: [new EmbedBuilder({
          title: '❌ A embed de gerenciamento do ticket foi possivelmente apagada... Não é possivel prosseguir.'
        }).setColor('Red')]
      })
      return
    }

    await message.edit({ components: [this.buttons({ isOpen: !ticket.closed })] })
    return channel
  }

  async check (): Promise<boolean> {
    const { guildId, user } = this.interaction
    const tickets = await db.tickets.get(`${guildId}.tickets`) as Record<string, TicketDBType>
    let ticketOpenId

    for (const [channelId, ticket] of Object.entries((tickets ?? []))) {
      if (ticket?.owner === user.id) {
        ticketOpenId = channelId
        console.log(ticket)
      }
    }

    if (ticketOpenId !== undefined) {
      await this.interaction.editReply({
        embeds: [
          new EmbedBuilder({
            title: `Olá ${user.username}`,
            description: '❌ | Você já possui um ticket aberto!'
          }).setColor('Red')
        ],
        components: [
          await Discord.buttonRedirect({
            guildId,
            channelId: ticketOpenId,
            emoji: { name: '🎫' },
            label: 'Ir ao Ticket'
          })
        ]
      })
      return true
    }
    return false
  }

  buttons ({ isOpen }: { isOpen: boolean }): ActionRowBuilder<ButtonBuilder> {
    const row = new ActionRowBuilder<ButtonBuilder>()
    row.addComponents(
      new CustomButtonBuilder({
        type: 'Ticket',
        permission: 'User',
        customId: 'Switch',
        label: isOpen ? 'Fechar' : 'Abrir',
        emoji: { name: isOpen ? '🔓' : '🔒' },
        style: isOpen ? ButtonStyle.Danger : ButtonStyle.Success
      })
    )
    if (!isOpen) {
      row.addComponents(
        new CustomButtonBuilder({
          type: 'Ticket',
          permission: 'User',
          customId: 'delTicket',
          label: 'Deletar',
          emoji: { name: '🗑️' },
          style: ButtonStyle.Danger
        })
      )
    }
    row.addComponents(
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
    return row
  }

  async switch ({ channelId }: { channelId: string }): Promise<void> {
    const { guildId, user } = this.interaction
    const ticket = await db.tickets.get(`${guildId}.tickets.${channelId}`) as TicketDBType
    const ClaimConstructor = new TicketClaim({ interaction: this.interaction })

    if (!((ticket.team ?? []).some((userTeam) => userTeam.id === user.id) ?? false) && user.id !== ticket.owner) {
      await this.interaction.editReply({
        embeds: [new EmbedBuilder({
          title: '❌ Você não ter permissão para fazer isso!'
        }).setColor('Red')]
      })
      return
    }

    const isOpen = ticket?.closed ?? false
    await db.tickets.set(`${guildId}.tickets.${channelId}.closed`, !isOpen)
    await this.Permissions({ channelId })
    const ticketChannel = await this.edit({ channelId, messageId: ticket.messageId })
    await ticketChannel?.send({
      embeds: [
        new EmbedBuilder({
          title: isOpen ? '🔓 Ticket aberto!' : '🔒 Ticket fechado!',
          footer: { text: `Por: ${user.displayName} | Id: ${user.id}`, iconURL: user?.avatarURL() ?? undefined }
        }).setColor(isOpen ? 'Green' : 'Red')
      ]
    })

    if (ticket.claim?.channelId === undefined || ticket.claim?.messageId === undefined) {
      await this.interaction.editReply({
        embeds: [new EmbedBuilder({
          title: '❌ Sistema de claim inexistente!?'
        }).setColor('Red')]
      })
      return
    }

    await ClaimConstructor.edit({ channelId: ticket.claim?.channelId, messageId: ticket.claim?.messageId, channelTicketId: channelId })
    await this.interaction.deleteReply()
  }

  public async delete (options: {
    type: 'delTicket' | 'EmbedDelete'
    channelId?: string // Apenas se for deletar algo que está fora do channel
  }): Promise<void> {
    const { type } = options
    let channelId = options.channelId
    const interaction = this.interaction
    if (!interaction.inCachedGuild()) return
    if (await this.validator()) return

    if (channelId === undefined) channelId = interaction.channelId ?? undefined
    if (channelId === undefined) {
      await interaction.editReply({
        embeds: [new EmbedBuilder({
          title: '❌ Não foi possivel determinal o channelId!'
        }).setColor('Red')]
      })
      return
    }

    const { guild, guildId, user } = interaction
    const embed = new EmbedBuilder()
      .setColor('Orange')
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
        const futureTime = new Date(now.getTime() + 5000)
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
          const ticket = tickets[channelId] as TicketDBType | undefined

          if (ticket === undefined) {
            await interaction.editReply({
              embeds: [new EmbedBuilder({
                title: '❌ Não foi possivel encontrar o channel do ticket!'
              }).setColor('Red')]
            })
            return
          }

          const channel = await guild.channels.fetch(ticket.channelId)

          await delay(5000)
          if (channel !== null) await channel.delete()

          /* Apagar as mensagens atrelasdas ao ticket */
          for (const { channelId, messageId } of ticket.messages) {
            const channel = await interaction.guild.channels.fetch(channelId)
            if (channel === undefined) continue
            if (!(channel instanceof TextChannel)) return

            await channel.messages.fetch(messageId).then(async (message) => {
              await message.delete()
            })
          }

          if (ticket.voice?.id !== undefined) await (await guild.channels.fetch(ticket.voice.id))?.delete()
          await db.tickets.delete(`${guildId}.tickets.${channelId}`)
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

  async Permissions ({ userId = null, channelId, remove = false, memberTeam = false }:
  { userId?: string | null, channelId: string, remove?: boolean, memberTeam?: boolean }): Promise<boolean> {
    const interaction = this.interaction
    const { guildId, user } = interaction
    const channel = interaction.guild?.channels.cache.find((channel) => channel.id === channelId) as TextChannel

    if (channel === undefined) {
      await interaction.editReply({
        embeds: [new EmbedBuilder({
          title: '❌ Esse ticket não existe para o bot!'
        }).setColor('Red')]
      })
      return true
    }

    const { users, team, closed, owner } = await db.tickets.get(`${guildId}.tickets.${channelId}`) as TicketDBType ?? []
    const PermUsers: User[] = []
    const PermTeamMember: User[] = []

    const allow = [
      PermissionsBitField.Flags.ViewChannel,
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.AttachFiles,
      PermissionsBitField.Flags.AddReactions,
      PermissionsBitField.Flags.ReadMessageHistory
    ]

    const permissionOverwrites = [
      {
        id: guildId,
        deny: [PermissionsBitField.Flags.ViewChannel]
      }
    ] as OverwriteResolvable[]

    if (userId !== null) {
      const userFetch = await interaction.client.users.fetch(userId)
      if (!remove) {
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
        permissionOverwrites.push({ id: userFetch.id, allow })
        if (memberTeam) {
          PermTeamMember.push({ name: userFetch.username, displayName: userFetch.displayName, id: userFetch.id })
        } else {
          PermUsers.push({ name: userFetch.username, displayName: userFetch.displayName, id: userFetch.id })
        }
      }
    }

    if (!(closed ?? false)) {
      permissionOverwrites.push({ id: owner, allow })

      if (users !== undefined) {
        for (const user of users) {
          if (remove && user.id === userId) continue
          permissionOverwrites.push({ id: user.id, allow })
          PermUsers.push(user)
        }
      }
    }
    if (team !== undefined) {
      for (const user of team) {
        if (remove && user.id === userId) continue
        permissionOverwrites.push({ id: user.id, allow })
        PermTeamMember.push(user)
      }
    }

    const changeUsers: User[] = []
    changeUsers.push(
      ...(users?.filter((item) => !PermUsers.includes(item))
        .concat(...PermUsers.filter((item) => !users.includes(item))) ?? [])
    )
    changeUsers.push(
      ...(team?.filter((item) => !PermTeamMember.includes(item))
        .concat(...PermTeamMember.filter((item) => !team.includes(item))) ?? [])
    )

    return await channel.edit({ permissionOverwrites })
      .then(async () => {
        await db.tickets.set(`${guildId}.tickets.${channelId}.users`, PermUsers)
        await db.tickets.set(`${guildId}.tickets.${channelId}.team`, PermTeamMember)

        if (userId === null) return false

        await interaction.deleteReply()
        if (remove) {
          await channel.send({
            embeds: [new EmbedBuilder({
              title: `❗ Usuário ${changeUsers.map((user) => user.displayName).join(', ')} foi removido do Ticket.`,
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
                title: `✅ Usuário ${changeUsers.map((user) => user.displayName).join(', ')} foi adicionado ao Ticket!`,
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
    const { guildId, client, guild } = this.interaction
    const ticket = await db.tickets.get(`${guildId}.tickets.${channelId}`) as TicketDBType
    const config = await db.guilds.get(`${guildId}.config.ticket`) as TicketConfig

    if (config?.logsId === undefined) {
      await this.interaction.editReply({
        embeds: [new EmbedBuilder({
          title: '⚠️ Atenção, o sistema de logs dos tickets não está configurado!',
          description: 'Um novo canal será criado para enviar as logs!',
          fields: [
            { name: 'Use o comando:', value: codeBlock('/config ticket logs-channel') }
          ]
        }).setColor('Orange')]
      })
    }

    const logs = config?.logsId !== undefined
      ? await guild?.channels.fetch(config.logsId)
      : await guild?.channels.create({
        name: '🎫・logs-tickets',
        type: ChannelType.GuildText,
        permissionOverwrites: [
          { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }
        ]
      })
    if (config?.logsId === undefined && logs?.id !== undefined) await db.guilds.set(`${guildId}.config.ticket.logsId`, logs.id)

    if (!(logs instanceof TextChannel)) {
      await this.interaction.editReply({
        embeds: [new EmbedBuilder({
          title: '⚠️ Atenção, não encontrei o channel onde serão enviadas as logs!',
          description: 'Use o comando: `/config ticket logs-channel:`'
        }).setColor('Orange')]
      })
      return
    }

    const teamUser = ticket.team?.[0]?.id !== undefined ? await client.users.fetch(ticket.team[0].id) : undefined
    const user = await client.guilds.cache.get(String(guildId))?.members.fetch(ticket.owner)

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
        { name: '🤝 Convidados:', value: codeBlock(ticket.users.length === 0 ? 'Não houve convidados!' : ticket.users?.map((user) => user.displayName)?.join(', ')), inline },
        { name: '\u200E', value: '\u200E', inline },

        { name: '📅 Data:', value: codeBlock(new Date(ticket.createAt).toLocaleString()), inline },
        { name: '\u200E', value: '\u200E', inline },
        { name: '\u200E', value: '\u200E', inline }
      ]
    }).setColor(user?.roles.color?.hexColor ?? null)

    let text = `📄 Historico do ${user?.displayName}\n\n`
    let dayCache
    let elements = 0

    for (const { name, value } of (embed.data.fields ?? [])) {
      if (value === '\u200E' || name === '\u200E') continue
      text += ((`${name} ${value.replace(/```/g, '')}`.replace(/(\r\n|\n|\r)/gm, '')) + (((elements % 2) !== 0) ? '\n\n' : '\n'))
      elements++
    }

    for (const message of (ticket.history ?? [])) {
      if (message === undefined) continue
      const data = new Date(message.date)
      const ano = data.getFullYear()
      const mes = (data.getMonth() + 1).toString().padStart(2, '0') // adiciona zero à esquerda, se necessário
      const dia = data.getDate().toString().padStart(2, '0')

      text += dia !== dayCache ? `\n\n[${ano}:${mes}:${dia}]\n\n` : ''
      text += `[${data.getHours()}:${data.getMinutes()}] [${message.role}]${message.deleted ? ' [DELETED] ' : ''} ${message.user.name}: ${message.message.content}\n`

      dayCache = dia
    }

    const files: AttachmentBuilder[] = [
      new AttachmentBuilder(Buffer.from(text), { name: `${ticket.owner}.log`, description: `Transcript do usuário ${user?.displayName ?? ticket.owner}` }),
      new AttachmentBuilder(Buffer.from(JSON.stringify(ticket.history.length === 0 ? { aviso: 'Nenhuma mensagem enviada!' } : ticket.history, null, 4)), { name: `${ticket.owner}.json`, description: `Transcript do usuário ${user?.displayName ?? ticket.owner}` })
    ]

    await logs.send({ embeds: [embed] })
    await logs.send({ files })
    await this.interaction.editReply({
      embeds: [new EmbedBuilder({
        title: '✅ Logs salvas com sucesso'
      }).setColor('Green')]
    })
  }
}
