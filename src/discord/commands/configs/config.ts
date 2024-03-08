import { db } from '@/app'
import { genEmbeds } from '@/crons/SystemStatus'
import { Command } from '@/discord/base'
import { setSystem } from '@/discord/commands/configs/utils/setSystem'
import { MpModalconfig } from '@/discord/components/config/modals/mpModal'
import { sendEmbed } from '@/discord/components/payments'
import { Database, validarURL } from '@/functions'
import { CustomButtonBuilder, Discord } from '@/functions/Discord'
import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  TextChannel,
  type ButtonBuilder
} from 'discord.js'

new Command({
  name: 'config',
  description: '[ ⚙️ configurar ] Use esse comando para configurar o bot.',
  dmPermission,
  type: ApplicationCommandType.ChatInput,
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
              name: 'ip',
              description: '[ 🔗 ] IP do servidor.',
              type: ApplicationCommandOptionType.String,
              required: false
            },
            {
              name: 'porta',
              description: '[ 🚪 ] Porta do servidor.',
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
      name: 'telegram',
      description: '[ ✈️ ] Configurar aspectos do Telegram',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'token',
          description: 'Token do seu bot',
          type: ApplicationCommandOptionType.String
        }
      ]
    }
  ],
  async run (interaction) {
    if (
      await Discord.Permission(
        interaction,
        'Administrator',
        'noPermissionBanKick'
      )
    ) { return }

    if (!interaction.inCachedGuild()) return
    const { options, guildId } = interaction
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
        case 'telegram': {
          await interaction.deferReply({ ephemeral: true })
          const token = options.getString('token')

          if (token !== null) {
            await new Database({
              interaction,
              pathDB: 'config.telegram.token',
              typeDB: 'guilds'
            }).set({
              data: token
            })
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
              const ip = options.getString('ip') as string
              const porta = options.getString('porta') as string

              if (canal !== null) {
                await new Database({
                  interaction,
                  typeDB: 'guilds',
                  pathDB: 'channel.minecraft'
                }).set({
                  data: canal,
                  text: 'setado para o status do servidor de minecraft'
                })
              }
              if (desc !== null) {
                await new Database({
                  interaction,
                  pathDB: 'minecraft.desc'
                }).set({
                  data: desc
                })
              }
              if (ip !== null) {
                await new Database({ interaction, pathDB: 'minecraft.ip' }).set(
                  {
                    data: ip
                  }
                )
              }
              if (porta !== null) {
                await new Database({
                  interaction,
                  pathDB: 'minecraft.porta'
                }).set({
                  data: porta
                })
              }
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
