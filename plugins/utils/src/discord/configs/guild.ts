import { console } from "@/controller/console";
import { Database } from "@/controller/database";
import { Config } from "@/discord/base/Config";
import ConfigTable from "@/entity/Config.entry";
import { ApplicationCommandOptionType, ChannelType, EmbedBuilder, TextChannel } from "discord.js";

new Config({
  name: 'guild',
  description: '[ 🗂 Servidor ] Configurar elementos do servidor',
  type: ApplicationCommandOptionType.Subcommand,
  options: [
    {
      name: 'ban-kick',
      description: '[ 🚫 Bans ] Canal onde ficará os avisos de banimentos de usuários.',
      type: ApplicationCommandOptionType.Channel,
      channelTypes: [ChannelType.GuildText]
    },
    {
      name: 'entrada',
      description: '[ 🛬 Entrada Users ] Canal onde ficará os avisos de entrada de novos usuários.',
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
      name: 'saída',
      description: '[ 🛫 Saída Users ] Canal onde ficará os avisos de saídas dos usuários.',
      type: ApplicationCommandOptionType.Channel,
      channelTypes: [ChannelType.GuildText]
    }
  ],
  async run(interaction) {
    const { options: dcOptions, guildId } = interaction
    if (guildId === null) return
    await interaction.deferReply({ ephemeral: true })
    const banKick = dcOptions.getChannel('ban-kick') as TextChannel
    const entrada = dcOptions.getChannel('entrada') as TextChannel
    const logsEquipe = dcOptions.getChannel('logs-equipe') as TextChannel
    const logsGeral = dcOptions.getChannel('logs-geral') as TextChannel
    const saída = dcOptions.getChannel('saída') as TextChannel

    /* Database settings */
    const config = new Database<ConfigTable>({ table: 'Config' })
    const find = { criteria: { guild: { id: guildId }} }
    const options = { where : { guild: { id: guildId } } }

    switch (true) {
      case (banKick !== null): {
        await config.createOrUpdate({
          find,
          update: { options, partialEntity: { logBanKick: banKick.id } },
          create: { entity: { guild: { id: guildId }, logBanKick: banKick.id } }
        }).then(async () => {
          await interaction.editReply({
            embeds: [new EmbedBuilder({
              title: `${banKick.name} setado para o banimento ou a expulsão de usuários!`
            })]
          })
        })
      }

      case (entrada !== null): {
        await config.createOrUpdate({
          find,
          update: { options, partialEntity: { logEntry: entrada.id } },
          create: { entity: { guild: { id: guildId }, logEntry: entrada.id } }
        }).then(async () => {
          await interaction.editReply({
            embeds: [new EmbedBuilder({
              title: `${entrada.name} setado para a entrada de novos usuários!`
            })]
          })
        })
      }

      case (logsEquipe !== null): {
        await config.createOrUpdate({
          find,
          update: { options, partialEntity: { logStaff: logsEquipe.id } },
          create: { entity: { guild: { id: guildId }, logStaff: logsEquipe.id } }
        }).then(async () => {
          await interaction.editReply({
            embeds: [new EmbedBuilder({
              title: `${logsEquipe.name} setado para as logs de entrada e saída da equipe!`
            })]
          })
        })
      }

      case (logsGeral !== null): {
        await config.createOrUpdate({
          find,
          update: { options, partialEntity: { logs: logsGeral.id } },
          create: { entity: { guild: { id: guildId }, logs: logsGeral.id } }
        }).then(async () => {
          await interaction.editReply({
            embeds: [new EmbedBuilder({
              title: `${logsGeral.name} setado para os logs!`
            })]
          })
        })
      }

      case (saída !== null): {
        await config.createOrUpdate({
          find,
          update: { options, partialEntity: { logExit: saída.id } },
          create: { entity: { guild: { id: guildId }, logExit: saída.id } }
        }).then(async () => {
          await interaction.editReply({
            embeds: [new EmbedBuilder({
              title: `${saída.name} setado para a saída de usuários!`
            })]
          })
        })
      }
    }
    
    console.log(await config.findOne({ where: { guild: { id: guildId } }, relations: { guild: true } }))
  },
})
