import { Database } from "@/controller/database"
import { ButtonBuilder } from "@/discord/base/CustomIntetaction"
import Template, { TypeTemplate } from "@/entity/Template.entry"
import { ActionDrawer } from "@/functions/actionDrawer"
import { checkChannel } from "@/functions/checkChannel"
import { ActionRowBuilder, ButtonInteraction, ButtonStyle, CacheType, CommandInteraction, EmbedBuilder, ModalSubmitInteraction, TextInputBuilder } from "discord.js"
const template = new Database<Template>({ table: 'Template' })
interface TicketOptions {
    interaction: CommandInteraction<CacheType> | ModalSubmitInteraction<CacheType> | ButtonInteraction<CacheType>
}

interface TicketCreate {
    title: string,
    description: string
    channelId: string
}

interface GenerateButtons {
  messageId?: string
}

export class Ticket {
  private readonly interaction
  constructor ({ interaction }: TicketOptions) {
    this.interaction = interaction
  }

  async createTemplate ({ title, description, channelId }: TicketCreate) {
    if (!(this.interaction instanceof CommandInteraction)) return
    if (!this.interaction.deferred) await this.interaction.deferReply()
    const channel = await checkChannel(channelId, this.interaction)
    const template = new Database<Template>({ table: 'Template' })

    if (!channel) return

    const embed = new EmbedBuilder({
      title,
      description,
      footer: { text: `Equipe ${this.interaction.guild?.name}`, iconURL: (this.interaction?.guild?.iconURL({ size: 64 }) ?? undefined) }
    })

    const components = await this.genEditButtons({})

    await channel.send({ embeds: [embed], components }).then(async (message) => {
      const create = await template.create({
        messageId: message.id,
        channelId: channel.id,
        embed: embed.data
      })
      await template.save(create)
    })
  }

  async genEditButtons ({ messageId }: GenerateButtons): Promise<ActionRowBuilder<ButtonBuilder>[]> {
    const row = [
      new ButtonBuilder({
        customId: `setTitle`,
        style: ButtonStyle.Secondary,
        label: 'Nome',
        emoji: { name: '📝' }
      }),
      new ButtonBuilder({
        customId: `setDescription`,
        style: ButtonStyle.Secondary,
        label: 'Descrição',
        emoji: { name: '📑' }
      }),
      new ButtonBuilder({
        customId: `setThumbnail`,
        style: ButtonStyle.Secondary,
        label: 'Miniatura',
        emoji: { name: '🖼️' }
      }),
      new ButtonBuilder({
        customId: `setImage`,
        style: ButtonStyle.Secondary,
        label: 'Banner',
        emoji: { name: '🌄' }
      }),
      new ButtonBuilder({
        customId: `setColor`,
        style: ButtonStyle.Secondary,
        label: 'Cor',
        emoji: { name: '🎨' }
      }),
      new ButtonBuilder({
        customId: 'SetSelect',
        style: ButtonStyle.Secondary,
        label: 'SelectMenu',
        emoji: { name: '🗄️' }
      }),
      new ButtonBuilder({
        customId: 'AddSelect',
        style: ButtonStyle.Secondary,
        label: 'Add Select',
        emoji: { name: '📝' },
        disabled: true
      }),
      new ButtonBuilder({      
        customId: 'SetButton',
        style: ButtonStyle.Secondary,
        label: 'Botão',
        emoji: { name: '🔘' }
      }),
      new ButtonBuilder({
        customId: 'SetModal',
        style: ButtonStyle.Secondary,
        label: 'Modal',
        emoji: { name: '📄' }
      }),
      new ButtonBuilder({
        customId: 'AddCategory',
        label: 'Add Categoria',
        emoji: { name: '🔖' },
        style: ButtonStyle.Secondary
      }),
      new ButtonBuilder({
        customId: 'Save',
        label: 'Salvar',
        emoji: { name: '✔️' },
        style: ButtonStyle.Success
    
      }),
      new ButtonBuilder({
        customId: 'DeleteTemplate',
        label: 'Apagar',
        emoji: { name: '✖️' },
        style: ButtonStyle.Danger
      })
    ]
  
    if (messageId !== undefined) {
      const templateData = (await template.findOne({ where: { messageId } }))
      const buttonType = {
        SetSelect: TypeTemplate.Select,
        SetButton: TypeTemplate.Button,
        SetModal: TypeTemplate.Modal,
      }

      if (templateData !== undefined) {
        for (const button of row) {
          const ButtonType = Object.entries(buttonType).find(([key]) => key === button.customId ) // [ 'SetModal', 'modal' ]

          if (ButtonType?.[0] === button.customId && templateData?.type === ButtonType[1]) {
            button.setStyle(ButtonStyle.Primary)
          }

          if (button.customId === 'AddSelect' && templateData?.type === TypeTemplate.Select) {
            button.setDisabled(false)
          }

          if (templateData?.properties?.[button.customId] === true) {
            button.setStyle(ButtonStyle.Primary)
          }
        }
      }


    }

    return ActionDrawer(row, 5)
  }

  async genProductionButtons ({ messageId }: GenerateButtons): Promise<ActionRowBuilder<ButtonBuilder>[]> {
    const templateData = (await template.findOne({ where: { messageId } }))
    const row = []

    switch (templateData?.type ?? TypeTemplate.Button) {
    case TypeTemplate.Modal:
    case TypeTemplate.Button:
      row.push(
        new ButtonBuilder({
          customId: 'Open',
          label: 'Abrir Ticket',
          style: ButtonStyle.Success,
          emoji: { name: '🎫' }
        }),
        new ButtonBuilder({
          customId: 'Config',
          emoji: { name: '⚙️' },
          style: ButtonStyle.Secondary
        })
      )
      break
    case TypeTemplate.Select:
    }

    row.push()
    return ActionDrawer(row, 5)
  }
}