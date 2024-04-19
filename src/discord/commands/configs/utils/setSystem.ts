import { db } from '@/app'
import { CustomButtonBuilder } from '@/functions'
import { brBuilder } from '@magicyan/discord'
import {
  ActionRowBuilder,
  type ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type ButtonInteraction,
  type CacheType, type CommandInteraction,
  type TextChannel
} from 'discord.js'

export async function setSystem (interaction: CommandInteraction<CacheType> | ButtonInteraction<CacheType>): Promise<void> {
  const { guildId, user } = interaction
  const channelDB = (await db.guilds.get(`${guildId}.channel.system`)) as string
  const systemData: Record<string, boolean | string> | null = await db.system.get(`${guildId}.status`)

  let channelSend

  if (channelDB !== undefined) {
    channelSend = interaction.guild?.channels.cache.get(String(channelDB)) as TextChannel
  }

  const configEmbed = new EmbedBuilder({
    title: '🎉 Configurações',
    description: brBuilder(
      '◈ Escolha quais sistemas do bot você deseja ativar ou desativar neste servidor.',
      '◈ Para configurar os tickets, utilize `/config ticket>`',
      'os Logs, Boas Vindas, e outos aspectos, utilize `/config guild`',
      'configure o sistema de pagamentos em: `</config pagamentos`'
    ),
    color: 0x57f287
  })

  const presenceEmbed = new EmbedBuilder({
    title: '⚙️ Presence Status',
    description: brBuilder(
      '◈ Ative ou Desative o status do Bot.',
      '◈ Escolha abaixo qual tipo de status deseja.',
      '◈ Os status são atualizados a cada ``15 segundos``.',
      '◈ Mensagens: Você pode personalizar os status com o comando `/config status opções`.',
      '◈ Minecraft: Para utilizar esse metodo configure-o em: `/config status minecraft`.'
    ),
    color: 0x57f287
  })

  const pterodactylEmbed = new EmbedBuilder({
    title: '🦖 Pterodactyl',
    description: brBuilder(
      'Timeout: Tempo que o sistema de status irá atualizar.'
    ),
    color: 0x57f287
  })

  const config = [
    new CustomButtonBuilder({
      permission: 'Admin',
      type: 'System',
      label: 'Ticket',
      customId: 'Ticket',
      emoji: { name: '🎫' },
      isProtected: { user }
    }),
    new CustomButtonBuilder({
      permission: 'Admin',
      type: 'System',
      customId: 'Welcomer',
      label: 'Boas Vindas',
      emoji: { name: '❤️' },
      isProtected: { user }
    }),
    new CustomButtonBuilder({
      permission: 'Admin',
      type: 'System',
      customId: 'Logs',
      label: 'Logs',
      emoji: { name: '📰' },
      isProtected: { user }
    }),
    new CustomButtonBuilder({
      permission: 'Admin',
      type: 'System',
      customId: 'Payments',
      label: 'Pagamentos',
      emoji: { name: '💲' },
      isProtected: { user }
    })
  ]

  const config2 = [
    new CustomButtonBuilder({
      permission: 'Admin',
      type: 'System',
      customId: 'DeleteServers',
      label: 'Delete Servers',
      emoji: { name: '🗑️' },
      isProtected: { user }
    })
  ]

  const presence = [
    new CustomButtonBuilder({
      permission: 'Admin',
      type: 'System',
      customId: 'Status',
      label: 'Status',
      emoji: { name: '⚙️' },
      isProtected: { user }
    }),
    new CustomButtonBuilder({
      permission: 'Admin',
      type: 'System',
      customId: 'StatusMinecraft',
      label: 'Minecraft',
      emoji: { name: '🧱' },
      isProtected: { user }
    }),
    new CustomButtonBuilder({
      permission: 'Admin',
      type: 'System',
      customId: 'StatusString',
      label: 'Mensagens',
      emoji: { name: '📃' },
      isProtected: { user }
    }),
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
  ]
  const presence2 = [
    new CustomButtonBuilder({
      permission: 'Admin',
      type: 'System',
      customId: 'StatusOnline',
      label: 'Online',
      emoji: { name: '🟢' },
      isProtected: { user }
    }),
    new CustomButtonBuilder({
      permission: 'Admin',
      type: 'System',
      customId: 'StatusAusente',
      label: 'Ausente',
      emoji: { name: '🟠' },
      isProtected: { user }
    }),
    new CustomButtonBuilder({
      permission: 'Admin',
      type: 'System',
      customId: 'StatusNoPerturbe',
      label: 'Não Perturbe',
      emoji: { name: '🔴' },
      isProtected: { user }
    }),
    new CustomButtonBuilder({
      permission: 'Admin',
      type: 'System',
      customId: 'StatusInvisível',
      label: 'Invisível',
      emoji: { name: '⚫' },
      isProtected: { user }
    })
  ]

  const pteroButtons = [
    new CustomButtonBuilder({
      permission: 'Admin',
      type: 'System',
      customId: 'PteroStatus',
      label: 'Status',
      emoji: { name: '⏲️' }
    }),
    new CustomButtonBuilder({
      permission: 'Admin',
      type: 'System',
      customId: 'PteroTimeout',
      label: 'Timeout',
      emoji: { name: '⏲️' }
    })
  ]

  const typeStatus: Record<string, string> = {
    StatusOnline: 'online',
    StatusAusente: 'idle',
    StatusNoPerturbe: 'dnd',
    StatusInvisível: 'invisible'
  }
  const allConfigs = [...config, ...config2, ...presence, ...pteroButtons]

  for (const value of allConfigs) {
    const { customId } = value
    if (customId === undefined) continue
    if (systemData === null) continue

    const isTrue = systemData?.[customId] ?? false
    if (value.data.style === undefined) value.setStyle(isTrue === true ? ButtonStyle.Success : ButtonStyle.Secondary)
  }

  for (const value of presence2) {
    const { customId } = value
    if (customId === undefined) continue
    if (systemData === null) continue

    const result = typeStatus[customId]
    const systemEnabled = systemData?.StatusType
    value.setStyle(systemEnabled === result ? ButtonStyle.Success : ButtonStyle.Secondary)
  }

  function genButtons (row: CustomButtonBuilder[]): ActionRowBuilder<ButtonBuilder> {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(...row)
  }

  const embedsData = [
    {
      embed: configEmbed,
      row: [genButtons(config), genButtons(config2)]
    },
    {
      embed: presenceEmbed,
      row: [genButtons(presence), genButtons(presence2)]
    },
    {
      embed: pterodactylEmbed,
      row: [genButtons(pteroButtons)]
    }
  ]

  try {
    for (let index = 1; index <= embedsData.length; index++) {
      const { embed, row } = embedsData[index - 1]
      const dbKey = `${guildId}.system.message${index}`
      const messageId = await db.messages.get(dbKey)

      await channelSend?.messages.fetch(messageId)
        .then(async (msg) => {
          await msg.edit({
            embeds: [embed],
            components: row
          })
        })
        .catch(async () => {
          await interaction.channel?.send({ embeds: [embed], components: row })
            .then(async (msg) => {
              await db.messages.set(dbKey, msg.id)
              await interaction.editReply({ content: '✅ | Mensagem enviada com sucesso!' })
            })
        })
    }
  } catch (error) {
    console.error(error)
  }
}
