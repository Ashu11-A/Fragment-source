import { console } from '@/controller/console.js'
import { Database } from '@/controller/database.js'
import { Command } from '@/discord/base/index.js'
import Config from '@/entity/Config.entry.js'
import Staff from '@/entity/Staff.entry.js'
import { ApplicationCommandOptionType, ApplicationCommandType, EmbedBuilder, PermissionsBitField } from 'discord.js'

new Command({
  name: 'equipe',
  dmPermission: false,
  description: '[ 💎 Moderação ] Add/Rem alguém da equipe',
  type: ApplicationCommandType.ChatInput,
  defaultMemberPermissions: PermissionsBitField.Flags.ManageRoles,
  options: [
    {
      name: 'usuário',
      description: 'Usuário a ser Add/Rem',
      required: true,
      type: ApplicationCommandOptionType.User
    },
    {
      name: 'cargo',
      description: 'Cargo que o Usuário irá ganhar',
      required: true,
      type: ApplicationCommandOptionType.Role
    },
    {
      name: 'tipo',
      description: 'Adicionar ou Remover',
      type: ApplicationCommandOptionType.String,
      choices: [
        { name: 'Adicionar', value: 'add' },
        { name: 'Remover', value: 'rem' }
      ],
      required: false

    }
  ],
  async run (interaction) {
    const { options, guild, guildId } = interaction
    if (guildId === null) return

    await interaction.deferReply({ ephemeral: true })
    const user = options.getUser('usuário', true)
    const member = await guild?.members.fetch(user.id)
    const cargo = options.getRole('cargo', true)
    const type = options.getString('tipo') ?? 'add'

    if (member === undefined) {
        await interaction.editReply({
            embeds: [new EmbedBuilder({
                title: '❌ Não encontrei o usuário que você informou!'
            }).setColor('Red')]
        })
        return
    }

    const config = await new Database<Config>({ table: 'Config' }).findOne({ where: { guild: { guildId: guildId ?? undefined } }, relations: { guild: true } })

    if (config?.logStaff === undefined) {
        await interaction.editReply({
            embeds: [new EmbedBuilder({
                title: '❌ O channel de logs não foi configurado!',
                description: 'Tente o comando: `/config guild logs-equipe`'
            }).setColor('Red')]
        })
        return
    }

    const channel = await guild?.channels.fetch(config.logStaff)
    if (channel?.isTextBased() !== true) {
        await interaction.editReply({
            embeds: [new EmbedBuilder({
                title: '❌ Não encontrei channel que foi configurado para o envio das logs!',
                description: 'Tente o comando: `/config guild logs-equipe`.'
            }).setColor('Red')]
        })
        return
    }

    if (user.id === interaction.user.id) {
      const embed = new EmbedBuilder({
        description: '❌ Você não pode utilizar este comando em sí mesmo.'
      }).setColor('Red')
      return await interaction.editReply({ embeds: [embed] })
    }

    let message = ''
    let error = false

    if (type === 'add') {
    message = `adicionado a equipe como <@&${cargo.id}>`
    member.roles.add(cargo.id)
        .then(async () => {
            const create = await new Database<Staff>({ table: 'Staff' }).create({ guild: { guildId }, role: cargo.id, userName: user.username, userId: user.id })
            await new Database<Staff>({ table: 'Staff' }).save(create).catch(() => error = true)
        })
        .catch(async (err: { code?: number }) => {
            console.log(err)
            error = true
            if (err?.code === 403) {
                return await interaction.editReply({ content: '❌ Não tenho permissão! Talvez o meu cargo seja inferior?!' })
            }
            return await interaction.editReply({ content: 'Ocorreu um erro!' })
        })
    }
    if (type === 'rem') {
        message = 'não integra mais a equipe'
        member.roles.remove(cargo.id)
            .then(async () => {
                await new Database<Staff>({ table: 'Staff' }).delete({ guild: { guildId }, userId: user.id })
            })
            .catch(async (err: { code?: number }) => {
                console.log(err)
                error = true
                if (err?.code === 403) {
                    return await interaction.editReply({ content: '❌ Não tenho permissão! Talvez o meu cargo seja inferior?!' })
                }
                return await interaction.editReply({ content: 'Ocorreu um erro!' })
            })
    }

    if (error) return

    const embed = new EmbedBuilder({
        title: '📰 | STAFF LOG',
        description: `<@${user?.id}> ${message}.`,
        footer: { text: `Equipe ${guild?.name}`, iconURL: (user.avatarURL({ size: 64 }) ?? undefined) },
        timestamp: new Date()
    }).setColor(cargo.color ?? 'Random')

    await channel.send({ embeds: [embed] })

    return await interaction.editReply({ embeds: [embed] })
  }
})
