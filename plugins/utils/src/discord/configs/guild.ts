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
      name: 'saída',
      description:
                    '[ 🛫 Saída Users ] Canal onde ficará os avisos de saídas dos usuários.',
      type: ApplicationCommandOptionType.Channel,
      channelTypes: [ChannelType.GuildText]
    }
  ],
  async run(interaction) {
    const { options, guildId } = interaction
    if (guildId === null) return
    await interaction.deferReply({ ephemeral: true })
    const banKick = options.getChannel('ban-kick') as TextChannel
    const entrada = options.getChannel('entrada') as TextChannel
    const logsEquipe = options.getChannel('logs-equipe') as TextChannel
    const logsGeral = options.getChannel('logs-geral') as TextChannel
    const saída = options.getChannel('saída') as TextChannel
    const config = new Database<ConfigTable>({ table: 'Config' })
    
    if (banKick !== null) {
      await config.upsert([{
        guild: { id: guildId },
        logBanKick: banKick.id
      }], {
        conflictPaths: ['guild'],
        skipUpdateIfNoValuesChanged: true,
        upsertType: 'on-conflict-do-update'
      }).then(async () => {
        await interaction.editReply({
          embeds: [new EmbedBuilder({
            title: `${banKick.name} setado para o banimento ou a expulsão de usuários!`
          })]
        })
      })
    }
    if (entrada !== null) {
      await config.upsert([{
        guild: { id: guildId },
        logEntry: entrada.id
      }], {
        conflictPaths: ['guild'],
        skipUpdateIfNoValuesChanged: true,
        upsertType: 'on-conflict-do-update'
      }).then(async () => {
        await interaction.editReply({
          embeds: [new EmbedBuilder({
            title: `${entrada.name} setado para a entrada de novos usuários!`
          })]
        })
      })
    }
    if (logsEquipe !== null) { 
      await config.upsert([{
        guild: { id: guildId },
        logStaff: logsEquipe.id
      }], {
        conflictPaths: ['guild'],
        skipUpdateIfNoValuesChanged: true,
        upsertType: 'on-conflict-do-update'
      }).then(async () => {
        await interaction.editReply({
          embeds: [new EmbedBuilder({
            title: `${entrada.name} setado para as logs de entrada e saída da equipe!`
          })]
        })
      })
    }
    if (logsGeral !== null) {
      await config.upsert([{
        guild: { id: guildId },
        logs: logsGeral.id
      }], {
        conflictPaths: ['guild'],
        skipUpdateIfNoValuesChanged: true,
        upsertType: 'on-conflict-do-update'
      }).then(async () => {
        await interaction.editReply({
          embeds: [new EmbedBuilder({
            title: `${entrada.name} setado para os logs!`
          })]
        })
      })
    }
    if (saída !== null) {
      await config.upsert([{
        guild: { id: guildId },
        logExit: saída.id
      }], {
        conflictPaths: ['guild'],
        skipUpdateIfNoValuesChanged: true,
        upsertType: 'on-conflict-do-update'
      }).then(async () => {
        await interaction.editReply({
          embeds: [new EmbedBuilder({
            title: `${saída.name} setado para a saída de usuários!`
          })]
        })
      })
    }
    console.log(await config.findOne({ where: { guild: { id: guildId } }, relations: { guild: true } }))
  },
})
