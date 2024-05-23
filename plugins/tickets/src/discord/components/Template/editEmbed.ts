import { Ticket } from "@/class/Ticket";
import { Database } from "@/controller/database";
import { Component } from "@/discord/base";
import Template from "@/entity/Template.entry";
import { checkHexCor } from "@/functions/checker";
import { TextInputBuilder } from "@discordjs/builders";
import { ActionRowBuilder, APIEmbed, APITextInputComponent, ComponentType, Embed, EmbedBuilder, HexColorString, ModalBuilder } from "discord.js";
const template = new Database<Template>({ table: 'Template' })

interface TextInputComponent extends APITextInputComponent {
  title: string
}

const modalData: Record<string, TextInputComponent> = {
  setTitle: {
    title: '❓| Qual será o Título da Embed?',
    label: 'Título da embed',
    placeholder: 'Ex: Pegue seu Ticket!',
    style: 1,
    max_length: 256,
    type: ComponentType.TextInput,
    custom_id: 'content'
  },
  setDescription: {
    title: '❓| Qual será a Descrição da Embed?',
    label: 'Descrição do produto',
    placeholder: 'Ex: Basta abrir seu embed e aguardar um membro dê nossa equipe para lhe ajudar.',
    style: 2,
    max_length: 4000,
    type: ComponentType.TextInput,
    custom_id: 'content'
  },
  setThumbnail: {
    title: '❓| Qual será a Miniatura da Embed?',
    label: 'Coloque um Link, ou digite "VAZIO"',
    placeholder: 'Ex: https://uma.imagemBem.ilustrativa/img.png',
    style: 1,
    max_length: 4000,
    type: ComponentType.TextInput,
    custom_id: 'content'
  },
  setImage: {
    title: '❓| Qual será o Banner da Embed?',
    label: 'Coloque um Link, ou digite "VAZIO"',
    placeholder: 'Ex: https://um.bannerBem.legal/img.png',
    style: 1,
    max_length: 4000,
    type: ComponentType.TextInput,
    custom_id: 'content'
  },
  setColor: {
    title: '❓| Qual será a Cor da Embed?',
    label: 'Cor em hexadecimal',
    placeholder: 'Ex: #13fc03',
    style: 1,
    max_length: 7,
    type: ComponentType.TextInput,
    custom_id: 'content'
  }
}

for (const [action, data] of Object.entries(modalData)) {
  new Component({
    customId: action,
    type: "Button",
    async run(interaction) {
      const modal = new ModalBuilder({
        customId: action,
        title: `Alterando ${this.customId.replace('Set', '')}`,
        components: [
          new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder(data))
          
        ]
      })
      await interaction.showModal(modal)
    },
  }),
  new Component({
    customId: action,
    type: "Modal",
    async run(interaction) {
      await interaction.deferReply({ ephemeral: true })
      const templateData = await template.findOne({ where: { messageId: interaction.message?.id } })
      
      if (templateData === null) {
        await interaction.editReply({
          embeds: [new EmbedBuilder({
            title: 'Não encontrei esse template no meu banco de dados!'
          }).setColor('Red')]
        })
        return
      }
      let content = interaction.fields.getTextInputValue('content')
      
      if (content.toLowerCase() === 'vazio'){
        content = ''
      }

      let error = false

      const embed = new EmbedBuilder(templateData.embed)
      switch (action) {
      case 'setTitle':
        embed.setTitle(content)
        break
      case 'setDescription':
        embed.setDescription(content)
        break
      case 'setThumbnail':
        embed.setThumbnail(content)
        break
      case 'setImage':
        embed.setImage(content)
        break
      case 'setColor':
        const [validador, message] = checkHexCor(content)
        if (!validador) {
          await interaction.editReply({ content: message })
          error = true
          break
        }
        embed.setColor(content as HexColorString)
        break
      }

      if (error) return

      templateData.embed = embed.toJSON()
      templateData.properties = Object.assign((templateData.properties ?? {}), { [action]: true })

      await template.save(templateData)
        .then(async () => {
          const ticket = new Ticket({ interaction })
          const components = await ticket.generateButtons({ messageId: interaction.message?.id })
          interaction.message?.edit({ embeds: [embed], components })
  
          await interaction.editReply({
            embeds: [new EmbedBuilder({
              title: 'Alteração salva com sucesso!'
            }).setColor('Green')]
          })

          setTimeout(() => {
            interaction.deleteReply()
          }, 2000)
        })
        .catch(async () => {
          await interaction.editReply({
            embeds: [new EmbedBuilder({
              title: 'Ocorreu um erro ao tentar salvar as informações no banco de dados!'
            }).setColor('Red')]
          })
        })

    },
  })
}