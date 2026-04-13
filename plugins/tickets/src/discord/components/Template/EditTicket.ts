import { TemplateButtonBuilder } from '@/class/TemplateButtonBuilder.js'
import { createDatabase } from '@/utils/database'
import { checkHexCor, checkURL, ModalBuilder } from 'discord'
import type { PluginContext } from 'discord'
import { ActionRowBuilder, type APIEmbed, type APITextInputComponent, ComponentType, EmbedBuilder, type HexColorString, MessageFlags, TextInputBuilder } from 'discord.js'

const notFound = new EmbedBuilder({ title: '❌ Não encontrei esse template no meu banco de dados!' }).setColor('Red')

interface TextInputComponent extends APITextInputComponent {
  title: string
  database: string
}

const modalData: Record<string, TextInputComponent> = {
  setTitle: { title: '❓| Qual será o Título da Embed?', label: 'Título da embed', placeholder: 'Ex: Pegue seu Ticket!', style: 1, max_length: 256, type: ComponentType.TextInput, custom_id: 'content', database: 'title' },
  setDescription: { title: '❓| Qual será a Descrição da Embed?', label: 'Descrição do produto', placeholder: 'Ex: Basta abrir seu embed e aguardar...', style: 2, max_length: 4000, type: ComponentType.TextInput, custom_id: 'content', database: 'description' },
  setThumbnail: { title: '❓| Qual será a Miniatura da Embed?', label: 'Coloque um Link, ou digite "VAZIO"', placeholder: 'Ex: https://uma.imagemBem.ilustrativa/img.png', style: 1, max_length: 4000, type: ComponentType.TextInput, custom_id: 'content', database: 'thumbnail.url' },
  setImage: { title: '❓| Qual será o Banner da Embed?', label: 'Coloque um Link, ou digite "VAZIO"', placeholder: 'Ex: https://um.bannerBem.legal/img.png', style: 1, max_length: 4000, type: ComponentType.TextInput, custom_id: 'content', database: 'image.url' },
  setColor: { title: '❓| Qual será a Cor da Embed?', label: 'Cor em hexadecimal', placeholder: 'Ex: #13fc03', style: 1, max_length: 7, type: ComponentType.TextInput, custom_id: 'content', database: 'color' },
}

export default function register(ctx: PluginContext): void {
  const database = createDatabase(ctx)

  for (const [action, data] of Object.entries(modalData)) {
    ctx.component({
      customId: action,
      type: 'Button',
      async run(interaction) {
        const templateData = await database.template.findOne({ where: { messageId: interaction.message.id } })
        const value = templateData?.embed?.[data.database as keyof APIEmbed]
        if (templateData === null) { await interaction.reply({ embeds: [notFound], ephemeral: true }); return }
        const modal = new ModalBuilder({
          customId: action,
          title: `Alterando ${data.title}`,
          components: [new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder({ ...data, value: typeof value !== 'string' ? undefined : value }))]
        })
        await interaction.showModal(modal)
      },
    })

    ctx.component({
      customId: action,
      type: 'Modal',
      async run(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })
        const templateData = await database.template.findOne({ where: { messageId: interaction.message?.id } })
        if (templateData === null) { await interaction.editReply({ embeds: [notFound] }); return }
        let content: null | string = interaction.fields.getTextInputValue('content')
        if (content.toLowerCase() === 'vazio') content = null

        let error = false
        const embed = new EmbedBuilder(templateData.embed)
        switch (action) {
        case 'setTitle': embed.setTitle(content); break
        case 'setDescription': embed.setDescription(content); break
        case 'setThumbnail': { const [v, m] = checkURL(content); if (!v) { await interaction.editReply({ content: m }); error = true; break } embed.setThumbnail(content); break }
        case 'setImage': { const [v, m] = checkURL(content); if (!v) { await interaction.editReply({ content: m }); error = true; break } embed.setImage(content); break }
        case 'setColor': { const [v, m] = checkHexCor(content); if (!v) { await interaction.editReply({ content: m }); error = true; break } embed.setColor(content as HexColorString); break }
        }
        if (error) return

        templateData.embed = embed.toJSON()
        templateData.properties = Object.assign((templateData.properties ?? {}), { [action]: true })
        await database.template.save(templateData)
          .then(async () => {
            const components = new TemplateButtonBuilder().setMode('debug').setProperties(templateData.properties).setSelects(templateData.selects).setType(templateData.type).setSystem(templateData.systems ?? []).render()
            interaction.message?.edit({ embeds: [embed], components })
            await interaction.editReply({ embeds: [new EmbedBuilder({ title: 'Alteração salva com sucesso!' }).setColor('Green')] })
            setTimeout(() => { interaction.deleteReply() }, 2000)
          })
          .catch(async () => { await interaction.editReply({ embeds: [new EmbedBuilder({ title: 'Ocorreu um erro ao tentar salvar as informações no banco de dados!' }).setColor('Red')] }) })
      },
    })
  }
}
