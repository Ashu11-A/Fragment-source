import { TemplateBuilder } from "@/class/TemplateBuilder";
import { Database } from "@/controller/database";
import TemplateTable from "@/entity/Template.entry";
import { ApplicationCommandOptionChoiceData, ApplicationCommandOptionType, ApplicationCommandType, ColorResolvable, Colors, resolveColor } from "discord.js";
import { Command } from "../base";

const templateDb = new Database<TemplateTable>({ table: 'Template' })

new Command({
  name: 'ticket',
  description: 'Sistema de tickets por comando',
  type: ApplicationCommandType.ChatInput,
  dmPermission: false,
  options: [
    {
      name: 'template',
      description: 'Editar Template',
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: 'message_id',
          description: 'Id da mensagem que quer editar',
          type: ApplicationCommandOptionType.String,
          required: true,
          autocomplete: true
        },
        {
          name: 'mode',
          description: 'Entrar/Sair do modo edição do template',
          type: ApplicationCommandOptionType.String,
          choices: [
            { name: 'Edição', value: 'debug' },
            { name: 'Produção', value: 'production' }
          ]
        },
        {
          name: 'title',
          description: 'Alterar título do template',
          type: ApplicationCommandOptionType.String,
        },
        {
          name: 'description',
          description: 'Alterar descrição do template',
          type: ApplicationCommandOptionType.String,
        },
        {
          name: 'thumbnail',
          description: 'Alterar Thumbnail do template',
          type: ApplicationCommandOptionType.String,
        },
        {
          name: 'image',
          description: 'Alterar Imagem do template',
          type: ApplicationCommandOptionType.String,
        },
        {
          name: 'color',
          description: 'Alterar cor do template',
          type: ApplicationCommandOptionType.String,
          autocomplete: true
        },
        {
          name: 'delete',
          description: 'Deletar template (Apagará a mensagem e os dados do database)',
          type: ApplicationCommandOptionType.Boolean,
        }
      ]
    }
  ],
  async autoComplete(interaction) {
    const { options, guildId,  } = interaction
    const respond: ApplicationCommandOptionChoiceData[] = []
    if (guildId === null) return

    switch (options.getFocused(true).name) {
    case 'message_id': {
      const templateData = await templateDb.find({ where: { guild: { id: guildId } } })
      respond.push(...templateData.map((template) => ({ name: template?.embed?.title ?? template.messageId, value: template.messageId })))
      break 
    }
    case 'color': {
      let num = 0
      for (const [color, value] of Object.entries(Colors)) {
        if (num === 25) continue
        if (color.includes('Dark')) continue
        respond.push({ name: color, value: String(value) })
        num++
      }
      break
    }

    }
    await interaction.respond(respond)
  },
  async run(interaction) {
    const { options } = interaction
    switch (options.getSubcommand()) {
    case 'template': {
      await interaction.deferReply({ ephemeral: true })
      const builder = new TemplateBuilder({ interaction })

      const templateId = options.getString('message_id', true)
      const switchMode = options.getString('mode')
      const title = options.getString('title')
      const description = options.getString('description')
      const thumbnail = options.getString('thumbnail')
      const image = options.getString('image')
      const color = options.getString('color')
      const isDelete = options.getBoolean('delete')

      if (isDelete) { await builder.delete({ messageId: templateId }); return }
      if (title !== null) builder.setTitle(title)
      if (description !== null) builder.setDescription(description)
      if (thumbnail !== null) builder.setThumbnail(thumbnail)
      if (image !== null) builder.setImage(image)
      if (color !== null) builder.setColor(color)
      if (switchMode) builder.setMode(switchMode as 'debug' | 'production')

      await builder.edit({ messageId: templateId })
      if (!interaction.replied) await interaction.deleteReply()
      break
    }
    }
   
  },
})