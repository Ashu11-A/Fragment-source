import { db } from '@/app'
import { genEmbeds } from '@/crons/SystemStatus'
import { Command } from '@/discord/base'
import { setSystem } from '@/discord/commands/configs/utils/setSystem'
import { MpModalconfig } from '@/discord/components/config/modals/mpModal'
import { sendEmbed } from '@/discord/components/payments'
import { ticketButtonsConfig } from '@/discord/components/tickets'
import { Database, validarURL } from '@/functions'
import { CustomButtonBuilder, Discord } from '@/functions/Discord'
import { type RoleForConfig } from '@/interfaces/Ticket'
import {
  ActionRowBuilder,
  type ApplicationCommandOptionChoiceData,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionsBitField,
  TextChannel,
  type ButtonBuilder
} from 'discord.js'

new Command({
  name: 'config',
  description: '[ ⚙️ configurar ] Use esse comando para configurar o bot.',
  dmPermission,
  type: ApplicationCommandType.ChatInput,
  defaultMemberPermissions: PermissionsBitField.Flags.Administrator,
  options: [
    {
      name: 'guild',
      description: '[ 🗂 Servidor ] Configurar elementos do servidor',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'ban-kick',
          description:
            '[ 🚫 Bans ] Canal onde ficará os avisos de banimentos de usuários.',
          type: ApplicationCommandOptionType.Channel,
          channelTypes: [ChannelType.GuildText]
        },
        {
          name: 'entrada',
          description:
            '[ 🛬 Entrada Users ] Canal onde ficará os avisos de entrada de novos usuários.',
          type: ApplicationCommandOptionType.Channel,
          channelTypes: [ChannelType.GuildText]
        },
        {
          name: 'logs-equipe',
          description: '[ 📃 Logs ] Use para definir o canal de logs.',
          type: ApplicationCommandOptionType.Channel
        },
        {
          name: 'logs-geral',
          description: '[ 📃 Logs ] Use para definir o canal de logs.',
          type: ApplicationCommandOptionType.Channel,
          channelTypes: [ChannelType.GuildText]
        },
        {
          name: 'panel',
          description:
            '[ 🌠 Embed ] Painel que habilita/desabilita os comandos.',
          type: ApplicationCommandOptionType.Channel,
          channelTypes: [ChannelType.GuildText]
        },
        {
          name: 'react-message',
          description:
            '[ 👍 React ] Canais onde mensagens serão automaticamente adicionadas reações',
          type: ApplicationCommandOptionType.Boolean
        },
        {
          name: 'saída',
          description:
            '[ 🛫 Saída Users ] Canal onde ficará os avisos de saídas dos usuários.',
          type: ApplicationCommandOptionType.Channel,
          channelTypes: [ChannelType.GuildText]
        }
      ]
    },
    {
      name: 'status',
      description: '[ ⚙️ Status ] Definir status personalizado ao bot.',
      type: ApplicationCommandOptionType.SubcommandGroup,
      options: [
        {
          name: 'opções',
          description: '[🔩] Opções Gerais',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'panel',
              description:
                '[ 🌠 Panel ] Adicione ou remova as mensagens de status',
              type: ApplicationCommandOptionType.Channel
            }
          ]
        },
        {
          name: 'minecraft',
          description:
            '[ 🧱 Minecraft ] Definir informações do servidor de Minecraft',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'canal',
              description: '[ 💬 ] Canal onde ficará a embed das informações.',
              type: ApplicationCommandOptionType.Channel,
              required: false
            },
            {
              name: 'desc',
              description:
                '[ 📄 ] Descrição do servidor (exemplo: RankUP, Factions).',
              type: ApplicationCommandOptionType.String,
              required: false
            },
            {
              name: 'ip-java',
              description: '[ 🔗 ] IP do servidor java.',
              type: ApplicationCommandOptionType.String,
              required: false
            },
            {
              name: 'ip-bedrock',
              description: '[ 🔗 ] IP do servidor bedrock.',
              type: ApplicationCommandOptionType.String,
              required: false
            }
          ]
        }
      ]
    },
    {
      name: 'pagamentos',
      description: '[ 🛒 Pagamentos ] Configure o sistema de pagamento.',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'add-produto',
          description:
            '[ 📦 ] Cria um novo produto configurável no canal desejado.',
          type: ApplicationCommandOptionType.Channel,
          channelTypes: [ChannelType.GuildText]
        },
        {
          name: 'carrinho',
          description:
            '[ 🗂 ] Escolha a categoria onde os carrinhos serão abertos',
          type: ApplicationCommandOptionType.Channel,
          channelTypes: [ChannelType.GuildCategory]
        },
        {
          name: 'config',
          description: '[ ⚙️ ] Configurar sistemas de pagamentos desejado.',
          type: ApplicationCommandOptionType.String,
          choices: [{ name: 'Mercado Pago', value: 'mp' }]
        },
        {
          name: 'logs',
          description: '[ 📃 ] Configurar registro dos pagamentos',
          type: ApplicationCommandOptionType.Channel,
          channelTypes: [
            ChannelType.GuildText
          ]
        }
      ]
    },
    {
      name: 'urls',
      description: '[ 🔗 ] Configure as URLs que o bot irá utilizar.',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'site',
          description: 'Homepage do projeto/host.',
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'loja',
          description: 'Se houver uma loja.',
          type: ApplicationCommandOptionType.String
        }
      ]
    },
    {
      name: 'ctrlpanel',
      description: '[ 🛒 ] Configure aspectos do ctrlPanel.',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'url',
          description: 'Para as integrações',
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'token',
          description: 'Token para fazer as requisições a API',
          type: ApplicationCommandOptionType.String
        }
      ]
    },
    {
      name: 'pterodactyl',
      description: '[ 🛒 ] Configure aspectos do pterodactyl.',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'url',
          description: 'Para as integrações',
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'token-panel',
          description: 'Token para fazer as requisições a API',
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'token-admin',
          description:
            'Token de um usuário administrador para fazer as requisições a API',
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'status',
          description: 'Definir local para o status do Pterodactyl',
          type: ApplicationCommandOptionType.Channel,
          channelTypes: [ChannelType.GuildText]
        }
      ]
    },
    {
      name: 'ticket',
      description: '[ 🎫 Ticket ] Configurar o sistema de Tickets',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'panel-embed',
          description: '[ 🎫 Ticket ] Envia a embed de configuração.',
          required: false,
          type: ApplicationCommandOptionType.Channel,
          channelTypes: [ChannelType.GuildText]
        },
        {
          name: 'limit',
          description: '[ 🎫 Ticket ] Limita a quantidade tickets por 24h.',
          required: false,
          type: ApplicationCommandOptionType.Number
        },
        {
          name: 'claim-channel',
          description: '[ 🎫 Ticket ] Chat onde seram enviadas os pedidos de ticket.',
          type: ApplicationCommandOptionType.Channel,
          channelTypes: [ChannelType.GuildText],
          required: false
        },
        {
          name: 'claim-limit',
          description: '[ 🎫 Ticket ] Limita a quantidade de tickets que pode se revindicar',
          type: ApplicationCommandOptionType.Number,
          minValue: 1,
          maxValue: 999,
          required: false
        },
        {
          name: 'logs-channel',
          description: '[ 🎫 Ticket ] Chat onde seram enviadas as logs dos tickets.',
          type: ApplicationCommandOptionType.Channel,
          channelTypes: [ChannelType.GuildText]
        },
        {
          name: 'add-role-team',
          required: false,
          description: '[ 🎫 Ticket ] Adicionar cargos do suporte.',
          type: ApplicationCommandOptionType.Role
        },
        {
          name: 'rem-role-team',
          description: '[ 🎫 Ticket ] Remover cargos',
          type: ApplicationCommandOptionType.String,
          required: false,
          autocomplete: true
        }
      ]
    }
  ],
  async autoComplete (interaction) {
    const { options, guildId } = interaction

    switch (options.getSubcommand()) {
      case 'ticket': {
        switch (options.data[0].options?.[0].name) {
          case 'rem-role-team': {
            const roles = await db.guilds.get(`${guildId}.config.ticket.roles`) as RoleForConfig[]
            const respond: Array<ApplicationCommandOptionChoiceData<string | number>> = []
            if (roles !== undefined) {
              for (const role of roles) {
                respond.push({ name: `${role.name} | ${role.id}`, value: role.id })
              }
            }
            await interaction.respond(respond)
            break
          }
        }
      }
    }
  },
  async run (interaction) {
    if (
      await Discord.Permission(
        interaction,
        'Administrator',
        'noPermissionBanKick'
      )
    ) { return }

    if (!interaction.inCachedGuild()) return
    const { options, guildId, guild } = interaction
    try {
      switch (options.getSubcommand(true)) {
        case 'guild': {
          await interaction.deferReply({ ephemeral: true })
          const banKick = options.getChannel('ban-kick') as TextChannel
          const entrada = options.getChannel('entrada') as TextChannel
          const logsEquipe = options.getChannel('logs-equipe') as TextChannel
          const logsGeral = options.getChannel('logs-geral') as TextChannel
          const panel = options.getChannel('panel') as TextChannel
          const saída = options.getChannel('saída') as TextChannel

          if (banKick !== null) {
            await new Database({ interaction, pathDB: 'channel.banKick' }).set({
              data: banKick,
              text: 'setado para o banimento ou a expulsão de usuários'
            })
          }
          if (entrada !== null) {
            await new Database({ interaction, pathDB: 'channel.entrada' }).set({
              data: entrada,
              text: 'setado para a entrada de novos usuários'
            })
          }
          if (logsEquipe !== null) {
            await new Database({
              interaction,
              pathDB: 'channel.staff_logs'
            }).set({
              data: logsEquipe,
              text: 'setado para as logs de entrada e saída da equipe'
            })
          }
          if (logsGeral !== null) {
            await new Database({ interaction, pathDB: 'channel.logs' }).set({
              data: logsGeral,
              text: 'setado para os logs'
            })
          }
          if (panel !== null) {
            await db.guilds.set(
              `${interaction.guild.id}.channel.system`,
              panel.id
            )
            await setSystem(interaction)
          }
          if (saída !== null) {
            await new Database({ interaction, pathDB: 'channel.saída' }).set({
              data: saída,
              text: 'setado para a saída de usuários'
            })
          }

          break
        }
        case 'pagamentos': {
          const addProduto = options.getChannel('add-produto')
          const carrinho = options.getChannel('carrinho')
          const config = options.getString('config')
          const logs = options.getChannel('logs')

          if (config !== null) {
            await MpModalconfig({ interaction })
          }

          if (addProduto !== null) {
            await interaction.deferReply({ ephemeral: true })
            await sendEmbed(interaction, addProduto as TextChannel)
          }
          if (carrinho !== null) {
            await interaction.deferReply({ ephemeral: true })
            await new Database({
              interaction,
              pathDB: 'config.category',
              typeDB: 'payments'
            }).set({
              data: carrinho.id
            })
          }

          if (logs !== null) {
            await interaction.deferReply({ ephemeral: true })
            await new Database({
              interaction,
              pathDB: 'config.logs',
              typeDB: 'payments'
            }).set({
              data: logs.id
            })
          }

          break
        }
        case 'urls': {
          await interaction.deferReply({ ephemeral: true })
          const site = options.getString('site')
          const loja = options.getString('loja')

          if (site !== null) {
            await new Database({ interaction, pathDB: 'urls.site' }).set({
              data: site
            })
          }
          if (loja !== null) {
            await new Database({ interaction, pathDB: 'urls.loja' }).set({
              data: loja
            })
          }
          break
        }
        case 'ctrlpanel': {
          await interaction.deferReply({ ephemeral: true })
          const token = options.getString('token')
          const url = options.getString('url')

          if (url !== null) {
            await new Database({
              interaction,
              pathDB: 'config.ctrlPanel.url',
              typeDB: 'payments'
            }).set({
              data: url
            })
          }
          if (token !== null) {
            await new Database({
              interaction,
              pathDB: 'config.ctrlPanel.token',
              typeDB: 'payments'
            }).set({
              data: token
            })
          }

          break
        }
        case 'pterodactyl': {
          await interaction.deferReply({ ephemeral: true })
          const url = options.getString('url')
          const tokenPanel = options.getString('token-panel')
          const tokenADM = options.getString('token-admin')
          const statusChannel = options.getChannel('status')

          if (url !== null) {
            const [isValid, formatedURL] = validarURL(url)
            if (isValid) {
              await new Database({
                interaction,
                pathDB: 'config.pterodactyl.url',
                typeDB: 'payments'
              }).set({
                data: formatedURL
              })
            } else {
              return await interaction.editReply({
                embeds: [
                  new EmbedBuilder({
                    title: '❌ | URL informada não é valida!'
                  }).setColor('Red')
                ]
              })
            }
          }
          if (tokenPanel !== null) {
            await new Database({
              interaction,
              pathDB: 'config.pterodactyl.tokenPanel',
              typeDB: 'payments'
            }).set({
              data: tokenPanel
            })
          }

          if (tokenADM !== null) {
            await new Database({
              interaction,
              pathDB: 'config.pterodactyl.tokenADM',
              typeDB: 'payments'
            }).set({
              data: tokenADM
            })
          }

          if (statusChannel !== null) {
            const embeds = await genEmbeds({ guildId, embedInit: true })
            if (embeds !== undefined && statusChannel instanceof TextChannel) {
              await statusChannel.send({
                embeds
              }).then(async (msg) => {
                await db.messages.set(`${guildId}.system.pterodactyl.messageId`, msg.id)
                await db.messages.set(`${guildId}.system.pterodactyl.channelId`, statusChannel.id)
              })
            }
          }

          break
        }
        case 'ticket': {
          await interaction.deferReply({ ephemeral })
          const channel = options.getChannel('panel-embed')
          const limit = options.getNumber('limit')
          const claimChannel = options.getChannel('claim-channel')
          const claimLimit = options.getNumber('claim-limit')
          const logs = options.getChannel('logs-channel')
          const addRole = options.getRole('add-role-team')
          const remRole = options.getString('rem-role-team')

          if (claimLimit !== null) {
            await new Database({
              interaction,
              pathDB: 'config.ticket.claimLimit',
              typeDB: 'guilds'
            }).set({
              data: claimLimit
            })
          }

          if (addRole !== null) {
            const roles = await db.guilds.get(`${guildId}.config.ticket.roles`) as RoleForConfig[]

            if ((roles ?? []).some((role) => role.id === addRole.id)) {
              await interaction.editReply({
                embeds: [new EmbedBuilder({
                  title: '❌ Esse cargo já está na lista!'
                }).setColor('Red')]
              })
              return
            }

            const newRoles = [
              ...(roles ?? []),
              { name: addRole.name, id: addRole.id }
            ] satisfies RoleForConfig[]

            console.log(roles, newRoles)

            await new Database({
              interaction,
              pathDB: 'config.ticket.roles',
              typeDB: 'guilds'
            }).set({
              data: newRoles
            })
          }

          if (remRole !== null) {
            const roles = await db.guilds.get(`${guildId}.config.ticket.roles`) as RoleForConfig[]
            const removedRole = roles.filter((role) => role.id !== remRole)

            await new Database({
              interaction,
              pathDB: 'config.ticket.roles',
              typeDB: 'guilds'
            }).set({
              data: removedRole
            })
          }

          if (channel !== null) {
            const sendChannel = guild?.channels.cache.get(String(channel?.id)) as TextChannel
            const embed = new EmbedBuilder({
              title: 'Pedir suporte',
              description: 'Se você estiver precisando de ajuda clique no botão abaixo',
              footer: { text: `Equipe ${interaction.guild?.name}`, iconURL: (interaction?.guild?.iconURL({ size: 64 }) ?? undefined) }
            }).setColor('Green')

            if (sendChannel !== undefined) {
              await sendChannel.send({ embeds: [embed] })
                .then(async (msg) => {
                  await db.messages.set(`${guildId}.ticket.${sendChannel.id}.messages.${msg.id}`, {
                    id: msg.id,
                    embed: embed.toJSON()
                  })
                  await ticketButtonsConfig({
                    interaction,
                    message: msg,
                    channelId: sendChannel.id
                  })
                  await interaction.editReply({
                    embeds: [
                      new EmbedBuilder()
                        .setDescription(`✅ | Mensagem enviada com sucesso ao chat: <#${sendChannel.id}>`)
                        .setColor('Green')
                    ],
                    components: [
                      await Discord.buttonRedirect({
                        guildId,
                        channelId: sendChannel.id,
                        emoji: { name: '🗨️' },
                        label: 'Ir ao canal'
                      })
                    ]
                  })
                })
            }
          }
          if (limit !== null) {
            await new Database({
              interaction,
              pathDB: 'config.ticket.limit',
              typeDB: 'guilds'
            }).set({
              data: limit
            })
          }
          if (claimChannel !== null) {
            await new Database({
              interaction,
              pathDB: 'config.ticket.claimId',
              typeDB: 'guilds'
            }).set({ data: claimChannel.id })
          }
          if (logs !== null) {
            await new Database({
              interaction,
              pathDB: 'config.ticket.logsId',
              typeDB: 'guilds'
            }).set({ data: logs.id })
          }
          break
        }
      }

      switch (options.getSubcommandGroup(false)) {
        case 'status': {
          switch (options.getSubcommand(true)) {
            case 'opções': {
              const channel = options.getChannel('panel')
              await interaction.deferReply()

              const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new CustomButtonBuilder({
                  customId: 'AddPresence',
                  permission: 'Admin',
                  label: 'Adicionar',
                  emoji: { name: '➕' },
                  type: 'Config',
                  style: ButtonStyle.Primary
                }),
                new CustomButtonBuilder({
                  customId: 'RemPresence',
                  permission: 'Admin',
                  label: 'Remover',
                  emoji: { name: '➖' },
                  type: 'Config',
                  style: ButtonStyle.Danger
                })
              )

              if (channel !== null) {
                await interaction.editReply({
                  embeds: [
                    new EmbedBuilder({
                      title: 'Gerencie as mensagens de status do bot'
                    }).setColor('Purple')
                  ],
                  components: [row]
                })
              }
              break
            }
            case 'minecraft': {
              await interaction.deferReply({ ephemeral: true })
              const canal = options.getChannel('canal') as TextChannel
              const desc = options.getString('desc') as string
              const ipJava = options.getString('ip-java') as string
              const ipBedrock = options.getString('ip-bedrock') as string

              if (canal !== null) {
                await new Database({ interaction, pathDB: 'config.minecraft.channel' }).set({
                  data: canal,
                  text: 'setado para o status do servidor de minecraft'
                })
              }
              if (desc !== null) {
                await new Database({ interaction, pathDB: 'config.minecraft.desc' }).set({
                  data: desc
                })
              }
              if (ipJava !== null) {
                await new Database({ interaction, pathDB: 'config.minecraft.ipJava' }).set({
                  data: ipJava
                })
              }
              if (ipBedrock !== null) {
                await new Database({ interaction, pathDB: 'config.minecraft.ipBedrock' }).set({
                  data: ipBedrock
                })
              }
              break
            }
          }
        }
      }
    } catch (error) {
      console.error(error)
      try {
        return await interaction.editReply({
          content: 'Ocorreu um erro!'
        })
      } catch {
        return await interaction.channel?.send({
          content: 'Ocorreu um erro!'
        })
      }
    }
  }
})
