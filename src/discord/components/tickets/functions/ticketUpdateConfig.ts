import { db } from '@/app'
import { createRowEdit } from '@/discord/components/SUEE/functions/createRowEdit'
import { CustomButtonBuilder } from '@/functions'
import { ActionRowBuilder, type ButtonBuilder, type ButtonInteraction, ButtonStyle, type CacheType, EmbedBuilder, type EmbedData, type Message, type ModalSubmitInteraction, StringSelectMenuBuilder, type StringSelectMenuInteraction } from 'discord.js'

export async function ticketButtonsConfig ({
  interaction,
  message,
  confirm = true
}: {
  interaction: StringSelectMenuInteraction<CacheType> | ModalSubmitInteraction<CacheType> | ButtonInteraction<CacheType>
  message?: Message<boolean>
  confirm?: boolean
}): Promise<void> {
  const { guildId, channelId } = interaction
  if (message === undefined) message = interaction.message as Message<boolean>

  const options: Array<{ label: string, description: string, value: string, emoji: string }> = []
  const data = await db.messages.get(`${guildId}.ticket.${channelId}.messages.${message.id}`)
  const embedEdit = await createRowEdit(interaction, message, 'ticket')
  const { embed } = await db.messages.get(`${guildId}.ticket.${channelId}.messages.${message?.id}`)
  const updateEmbed = new EmbedBuilder(embed as EmbedData)

  if (embed !== undefined && typeof embed.color === 'string') {
    if (embed.color.startsWith('#') === true) {
      updateEmbed.setColor(parseInt(embed.color.slice(1), 16))
    }
  }

  const setSystem = [
    new CustomButtonBuilder({
      permission: 'Admin',
      type: 'Ticket',
      customId: 'SetSelect',
      label: 'SelectMenu',
      emoji: { name: '🗄️' }
    }),
    new CustomButtonBuilder({
      permission: 'Admin',
      type: 'Ticket',
      customId: 'AddSelect',
      label: 'Add Select',
      emoji: { name: '📝' },
      disabled: true
    }),
    new CustomButtonBuilder({
      permission: 'Admin',
      type: 'Ticket',
      customId: 'SetButton',
      label: 'Botão',
      emoji: { name: '🔘' }
    }),
    new CustomButtonBuilder({
      permission: 'Admin',
      type: 'Ticket',
      customId: 'SetModal',
      label: 'Modal',
      emoji: { name: '📄' }
    })
  ]

  const saveDelete = [
    new CustomButtonBuilder({
      permission: 'Admin',
      type: 'Ticket',
      customId: 'EmbedCategory',
      label: 'Panel Category',
      emoji: { name: '🖥️' },
      style: ButtonStyle.Secondary
    }),
    new CustomButtonBuilder({
      permission: 'Admin',
      type: 'Ticket',
      customId: 'Save',
      label: 'Salvar',
      emoji: { name: '✔️' },
      style: ButtonStyle.Success

    }),
    new CustomButtonBuilder({
      permission: 'Admin',
      type: 'Ticket',
      customId: 'EmbedDelete',
      label: 'Apagar',
      emoji: { name: '✖️' },
      style: ButtonStyle.Danger

    })
  ]

  let number = 0
  if (data?.select !== undefined) {
    data.select.forEach(({ title, description, emoji }: { title: string, description: string, emoji: string }) => {
      options.push({
        label: title,
        description,
        value: String(number),
        emoji
      })
      number += 1
    })
  }

  let row4
  if (data?.properties?.SetSelect === true) {
    row4 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder({
        custom_id: '-1_User_Ticket_RowSelect',
        placeholder: 'Escolha qual tipo de ticket deseja abrir!',
        options
      })
    )
  } else {
    row4 = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new CustomButtonBuilder({
        type: 'Ticket',
        permission: 'User',
        customId: 'SelectType',
        emoji: { name: '🎫' },
        label: 'Abra seu ticket',
        style: ButtonStyle.Success
      })
    )
  }

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(...setSystem)
  const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(...saveDelete)

  for (const value of setSystem) {
    const { customId } = value
    if (customId === undefined) continue

    if (customId === 'AddSelect' || customId === 'RemSelect') {
      value.setDisabled(!(data?.properties?.SetSelect === true))
    }

    value.setStyle(data?.properties !== undefined && data?.properties[customId] === true ? ButtonStyle.Primary : ButtonStyle.Secondary)
  }

  for (const value of saveDelete) {
    const { customId } = value
    if (customId === undefined) continue

    if (customId === 'EmbedCategory') {
      value.setStyle(data?.properties !== undefined && data?.properties[customId] === true ? ButtonStyle.Primary : ButtonStyle.Secondary)
    }
  }

  for (const value of row4.components) {
    if (value instanceof StringSelectMenuBuilder) {
      const result = data?.properties?.config

      if (result === undefined || result === true) {
        value.setPlaceholder('Modo edição, selecione um valor para remover.')
      } else {
        value.setPlaceholder('Escolha qual tipo de ticket deseja abrir!')
      }
    }
  }

  try {
    await message.edit({ embeds: [updateEmbed], components: [embedEdit, row2, row3, row4] })
    if (confirm) await interaction.editReply({ content: '✅ | Salvado com sucesso!' })
  } catch (err) {
    console.log(err)
    await message.edit({ embeds: [updateEmbed], components: [embedEdit, row2, row3] })
    if (confirm) await interaction.editReply({ content: '❌ | não foi possível renderizar o SelectMenu, pois ele não contem nenhum item...!' })
  }
}

export async function buttonsUsers ({ interaction }: {
  interaction: ButtonInteraction<CacheType>
}): Promise<void> {
  const { guildId, channelId, message } = interaction
  const options: Array<{ label: string, description: string, value: string, emoji: string }> = []
  const data = await db.messages.get(`${guildId}.ticket.${channelId}.messages.${message.id}`)
  const updateEmbed = new EmbedBuilder(data?.embed as EmbedData)

  options.push({
    label: 'Configurações',
    description: '[ADM] Apenas para editar esse ticket!',
    emoji: '⚙️',
    value: 'config'
  })

  let number = 1
  if (data?.select !== undefined) {
    data?.select.forEach(({ title, description, emoji }: { title: string, description: string, emoji: string }) => {
      options.push({
        label: title,
        description,
        value: String(number),
        emoji
      })
      number += 1
    })
  }

  if (data?.embed !== undefined && typeof data.embed.color === 'string') {
    if (data.embed.color.startsWith('#') === true) {
      updateEmbed.setColor(parseInt(data.embed.color.slice(1), 16))
    }
  }

  const row1Buttons = [
    new StringSelectMenuBuilder({
      custom_id: '-1_User_Ticket_RowSelectProduction',
      placeholder: 'Escolha qual tipo de ticket deseja abrir!',
      options
    })
  ]

  const botao = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new CustomButtonBuilder({
      type: 'Ticket',
      customId: 'SelectType',
      label: 'Abra seu ticket',
      emoji: { name: '🎫' },
      style: ButtonStyle.Success
    }),
    new CustomButtonBuilder({
      type: 'Ticket',
      customId: 'Config',
      permission: 'Admin',
      emoji: { name: '⚙️' },
      style: ButtonStyle.Secondary
    })
  )

  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(...row1Buttons)

  try {
    if (data?.properties?.SetSelect === true && data?.select !== undefined) {
      await message.edit({ embeds: [updateEmbed], components: [selectRow] })
        .then(async () => {
          await interaction.reply({ content: '✅ | Embed salva com sucesso', ephemeral: true })
            .catch(async () => await interaction.followUp({ content: '✅ | Mensagem atualizada com sucesso', ephemeral: true }))
        })
    } else {
      await message.edit({ embeds: [updateEmbed], components: [botao] })
        .then(async () => {
          await interaction.reply({ content: '✅ | Embed salva com sucesso', ephemeral: true })
            .catch(async () => await interaction.followUp({ content: '✅ | Mensagem atualizada com sucesso', ephemeral: true }))
        })
    }
  } catch (err) {
    console.log(err)
  }
}
