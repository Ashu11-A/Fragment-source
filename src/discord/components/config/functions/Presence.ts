import { db } from '@/app'
import { ActionRowBuilder, EmbedBuilder, ModalBuilder, type ModalSubmitInteraction, StringSelectMenuBuilder, type StringSelectMenuInteraction, TextInputBuilder, TextInputStyle, type ButtonInteraction, type CacheType } from 'discord.js'

export async function modalPresence (options: {
  interaction: ButtonInteraction<CacheType>
}): Promise<void> {
  const { interaction } = options
  const modal = new ModalBuilder({ custom_id: '-1_Admin_Config_addPresence', title: 'Messages for Presence' })
  const input1 = new ActionRowBuilder<TextInputBuilder>({
    components: [
      new TextInputBuilder({
        custom_id: 'msg1',
        label: 'Primeira mensagem',
        placeholder: 'Digite uma mensagem aqui.',
        style: TextInputStyle.Short,
        required: false,
        value: 'Em desenvolvimento...'
      })
    ]
  })

  const input2 = new ActionRowBuilder<TextInputBuilder>({
    components: [
      new TextInputBuilder({
        custom_id: 'msg2',
        label: 'Segunda mensagem',
        placeholder: 'Sabia que você pode colocar quantas mensagens quiser?.',
        style: TextInputStyle.Short,
        required: false,
        value: 'Criado por Ashu....'
      })
    ]
  })

  const input3 = new ActionRowBuilder<TextInputBuilder>({
    components: [
      new TextInputBuilder({
        custom_id: 'msg3',
        label: 'Terceira mensagem',
        placeholder: 'Só rodar ele novamente, e se quiser apagar, rode o Remover.',
        style: TextInputStyle.Short,
        required: false
      })
    ]
  })

  modal.setComponents(input1, input2, input3)

  await interaction.showModal(modal)
}

export async function delPresence (options: {
  interaction: ButtonInteraction<CacheType>
}): Promise<void> {
  const { interaction } = options
  await interaction.deferReply({ ephemeral })
  const dataDb = await db.messages.get(`${interaction.guildId}.system.status.messages`)
  const data: Array<{ label: string, description: string, value: string, emoji: string }> = []
  let number = 0

  if (dataDb === undefined) {
    await interaction.editReply({
      embeds: [
        new EmbedBuilder({
          title: 'Não há nenhum item no database!'
        }).setColor('Red')
      ]
    })
    return
  }
  dataDb.forEach((message: string, index: number) => {
    number += 1
    data.push({
      label: `Mensagem ${index + 1}`,
      description: message,
      value: String(index),
      emoji: '📝'
    })
  })
  const row = new ActionRowBuilder<StringSelectMenuBuilder>({
    components: [
      new StringSelectMenuBuilder({
        custom_id: '-1_Admin_Config_messagesStatusArray',
        placeholder: 'Selecione as mensagens que deseja deletar',
        minValues: 1,
        maxValues: number,
        options: data
      })
    ]
  })
  await interaction.editReply({ components: [row] })
}

export async function setPresence (options: {
  interaction: ModalSubmitInteraction<CacheType>
}): Promise<void> {
  const { interaction } = options
  const { fields, guildId } = interaction
  const fieldNames = ['msg1', 'msg2', 'msg3']

  let data = await db.messages.get(`${guildId}.system.status.messages`)
  if (data === undefined || data === Object || data === '' || data === null) {
    data = []
  }
  console.log(data)
  for (const fieldName of fieldNames) {
    const message = fields.getTextInputValue(fieldName)

    if (message !== null && message !== '') {
      data.push(message)
    }
  }
  await db.messages.set(`${guildId}.system.status.messages`, data)

  await interaction.reply({ content: '✅ | Modal enviado com sucesso!', ephemeral: true })
}

export async function delModalPresence (options: {
  interaction: StringSelectMenuInteraction<CacheType>
}): Promise<void> {
  const { interaction } = options
  const { guildId } = interaction
  const values = await db.messages.get(`${guildId}.system.status.messages`)
  const deleteValues = interaction.values.map(Number)
  const updatedValues = values.filter((_: string, index: number) => !deleteValues.includes(index))

  await db.messages.set(`${guildId}.system.status.messages`, updatedValues)

  const embed = new EmbedBuilder({
    title: 'Deletando as mensagens seleciondas...'
  }).setColor('Red')

  for (const num of deleteValues) {
    embed.addFields({ name: `Mensagem ${num + 1}:`, value: values[num], inline: true })
  }
  await interaction.reply({
    embeds: [embed],
    ephemeral: true
  })
}
