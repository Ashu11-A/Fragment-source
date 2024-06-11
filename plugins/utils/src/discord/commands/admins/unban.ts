import { EmbedBuilder, ApplicationCommandOptionType, ApplicationCommandType, type TextChannel, codeBlock, PermissionsBitField } from 'discord.js'
import { Command } from '@/discord/base/index.js'
import { Database } from '@/controller/database.js'
import Config from '@/entity/Config.entry.js'

new Command({
  name: 'unban',
  description: '[ 💎 Moderação ] Desbane um usuário do servidor',
  dmPermission: false,
  type: ApplicationCommandType.ChatInput,
  defaultMemberPermissions: PermissionsBitField.Flags.BanMembers,
  options: [
    {
      name: 'usuário',
      description: 'ID do usuário a ser desbanido',
      required: true,
      type: ApplicationCommandOptionType.String
    },
    {
      name: 'motivo',
      description: 'Motivo do desbanimento',
      type: ApplicationCommandOptionType.String
    }
  ],
  async run (interaction): Promise<void> {
    await interaction.deferReply({ ephemeral: true })

    const { guild, options, guildId } = interaction
    const userID = options.getString('usuário', true)
    const reason: string = options.getString('motivo') ?? 'Nenhum motivo especificado'
    const logsDB = await new Database<Config>({ table: 'Config' }).findOne({ where: { guild: { guildId: guildId ?? undefined  }}, relations: { guild: true } })
    const logsChannel = logsDB?.logBanKick !== undefined ? await interaction.guild?.channels.fetch(logsDB?.logBanKick) as TextChannel : undefined

    try {
      if (isNaN(Number(userID))) {
        const embed = new EmbedBuilder()
          .setTitle('Erro')
          .setDescription('O ID do usuário especificado é inválido.')
          .setColor('Red')
        await interaction.editReply({ embeds: [embed] })
        return
      }

      const bans = await guild?.bans.fetch()
      if (bans?.has(userID) !== null && !((bans?.has(userID)) ?? false)) {
        const embed = new EmbedBuilder()
          .setTitle('Erro')
          .setDescription('O usuário especificado não está banido.')
          .setColor('Red')
        await interaction.editReply({ embeds: [embed] })
        return
      }

      await guild?.members.unban(userID, reason)
        .then(async () => {
          const embed = new EmbedBuilder()
            .setColor('Green')
            .setTitle('Usuário desbanido com sucesso!')
            .setDescription(
              `${userID} foi desbanido do servidor.`
            )
            .addFields(
              {
                name: 'Usuário desbanido',
                value: codeBlock(`ID: ${userID}`)
              },
              {
                name: 'Moderador responsável',
                value: `${interaction.user.username}`
              },
              { name: 'Motivo', value: reason },
              {
                name: 'Data e Hora',
                value: new Date().toLocaleString('pt-BR', {
                  timeZone: 'America/Sao_Paulo'
                })
              }
            )

          if (logsChannel !== undefined) {
            await logsChannel.send({ embeds: [embed] })
          }

          await interaction.editReply({ embeds: [embed] })
        }).catch(async (err) => {
          await interaction.editReply({
            content: `Ocorreu um erro ao desbanir o usuário!\n${codeBlock('ts', err)}`
          })
        })
    } catch (err) {
      await interaction.editReply({
        content: `Ocorreu um erro ao desbanir o usuário!\n ${codeBlock('ts', String(err))}`
      })
    }
  }
})
