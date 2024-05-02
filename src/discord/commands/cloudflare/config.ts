import { db } from '@/app'
import { Command } from '@/discord/base'
import { Discord } from '@/functions'
import { ApplicationCommandOptionType, ApplicationCommandType, EmbedBuilder } from 'discord.js'

new Command({
  name: 'cloudflare',
  description: '[ ☁️ Cloudflare ] Configurar propriedades do cloudflare.',
  dmPermission,
  type: ApplicationCommandType.ChatInput,
  defaultMemberPermissions: 'Administrator',
  options: [
    {
      name: 'keys',
      description: '[ ☁️ Cloudflare ] Configurar chaves de API.',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'email',
          description: '[ ☁️ Cloudflare ] Email Registrado no Cloudflare.',
          required: false,
          type: ApplicationCommandOptionType.String
        },
        {
          name: 'global_api_key',
          description: '[ ☁️ Cloudflare ] Chave global da API.',
          required: false,
          type: ApplicationCommandOptionType.String
        }
      ]
    },
    {
      name: 'manage',
      description: '[ ☁️ Cloudflare ] Gerencie o sistema de atualização',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'old-ip',
          description: '[ ☁️ Cloudflare ] Definir o ip antigo, isso permite implementar outros records a atualização!',
          required: false,
          type: ApplicationCommandOptionType.String
        }
      ]
    }
  ],
  async run (interaction) {
    const { options, guildId } = interaction
    if (await Discord.Permission(interaction, 'Administrator')) return

    await interaction.deferReply({ ephemeral })

    switch (options.getSubcommand()) {
      case 'manage': {
        switch (options.data[0].options?.[0].name) {
          case 'old-ip': {
            const ip = options.getString('old-ip', true)
            const regexIP = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
            // IP test

            if (!regexIP.test(ip)) {
              await interaction.editReply({
                embeds: [new EmbedBuilder({
                  title: '❌ Formato IP invalido!'
                }).setColor('Red')]
              })
              return
            }

            await db.cloudflare.set(`${guildId}.saved.ipString`, ip)
            await interaction.editReply({
              embeds: [new EmbedBuilder({
                title: '✅ Propriedade `` saved.ipString ``, atribuida com sucesso no database!'
              }).setColor('Green')]
            })
            break
          }
        }
        break
      }
      case 'keys': {
        for (const option of (options.data.filter((option) => option.name === 'keys')[0]?.options ?? [])) {
          console.log(option)
          if (typeof option?.value === 'undefined') continue

          await db.cloudflare.set(`${guildId}.keys.${option.name}`, option?.value)
          await interaction.editReply({
            embeds: [new EmbedBuilder({
              title: '✅ Propriedade ``' + option.name + '``, atribuida com sucesso no database!'
            }).setColor('Green')]
          })
        }
        break
      }
    }
  }
})
