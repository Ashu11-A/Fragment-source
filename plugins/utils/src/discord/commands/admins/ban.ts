import { EmbedBuilder, ApplicationCommandOptionType, ApplicationCommandType, type TextChannel, GuildMember, codeBlock, PermissionsBitField } from 'discord.js'
import { Command, Discord } from '@/discord/base'
import { Database } from '@/controller/Database'
import Config from '@/entity/Config.entry'
import { console } from '@/controller/console'

new Command({
  name: 'ban',
  dmPermission: false,
  description: '[ 💎 Moderação ] Bane um usuário do servidor',
  type: ApplicationCommandType.ChatInput,
  defaultMemberPermissions: PermissionsBitField.Flags.BanMembers,
  options: [
    {
      name: 'usuário',
      description: 'Usuário a ser banido',
      required: true,
      type: ApplicationCommandOptionType.User
    },
    {
      name: 'deletar-mensagens',
      description: 'Excluir mensagens a quantos dias?',
      type: ApplicationCommandOptionType.Number,
      choices: [
        { name: 'Deletar mensagens de até 7d atrás', value: 7 },
        { name: 'Deletar mensagens de até 6d atrás', value: 6 },
        { name: 'Deletar mensagens de até 5d atrás', value: 5 },
        { name: 'Deletar mensagens de até 4d atrás', value: 4 },
        { name: 'Deletar mensagens de até 3d atrás', value: 3 },
        { name: 'Deletar mensagens de até 2d atrás', value: 2 },
        { name: 'Deletar mensagens de até 1d atrás', value: 1 },
        { name: 'Deletar nenhuma mensagem', value: 0 }
      ],
      required: false
    },
    {
      name: 'motivo',
      description: 'Motivo do banimento',
      type: ApplicationCommandOptionType.String
    }
  ],
  async run (interaction) {
    const { options, guildId } = interaction
    const user = options.getUser('usuário', true)
    const member = options.getMember('usuário')
    const deleteMSG = options.getNumber('deletar-mensagens') ?? 0
    const reason = options.getString('motivo') ?? 'Nenhum motivo especificado'
    await interaction.deferReply({ ephemeral: true })

    const logsDB = await new Database<Config>({ table: 'Config' }).findOne({ where: { guild: { id: guildId ?? undefined  }}, relations: { guild: true } })
    const logsChannel = logsDB?.logBanKick !== undefined ? await interaction.guild?.channels.fetch(logsDB?.logBanKick) as TextChannel : undefined

    if (user.id === interaction.user.id) {
      return await interaction.editReply({
        embeds: [
          new EmbedBuilder({
            title: '❌ Não permitido!',
            description: 'Você não pode se banir do servidor.'
          }).setColor('Orange')
        ]
      })
    }

    if (user.id === Discord.client?.user?.id) {
      return await interaction.editReply({ 
        embeds: [
          new EmbedBuilder({
            title: '❌ Não permitido!',
            description: 'Você quer me banir?'
          }).setColor('Orange')
        ]
      })
    }

    // Tenta banir o usuário
    try {
      if (!(member instanceof GuildMember)) {
        return await interaction.editReply({
          embeds: [new EmbedBuilder({
            title: '❌ Usuário não está disponível na lista de membros do bot! tente mais tarde.'
          }).setColor('Red')]
        })
      }
      await member.ban({ reason, deleteMessageSeconds: deleteMSG })
      // Adiciona o log de warning após o comando ter sido executado
      console.log(
        `BAN O usuario ${interaction.user.username} com o ID: ${interaction.user.id} baniu o ${user.username} de ID: ${user.id}`
      )
      const embed = new EmbedBuilder({
        title: '✅ Usuário banido com sucesso!',
        description: `${user.username} foi banido do servidor.`,
        fields: [
          {
            name: 'Usuário Banido',
            value: codeBlock(`User: ${user.username}'\n'ID: ${user?.id}`)
          },
          {
            name: 'Moderador responsável',
            value: `${interaction.user.username}`
          },
          { name: 'Motivo', value: reason },
        ],
        footer: { text: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) }
      }).setColor('Green')

      if (logsChannel !== undefined) {
        await logsChannel.send({ embeds: [embed] })
      }

      await interaction.editReply({ embeds: [embed] })
    } catch (error) {
      console.error(error)
      await interaction.editReply({
        content: 'Ocorreu um erro ao banir o usuário!',
      })
    }
  }
})
