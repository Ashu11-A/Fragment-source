import { Database } from "@/controller/database"
import { ButtonBuilder, StringSelectMenuBuilder } from "@/discord/base/CustomIntetaction"
import TemplateTable, { TypeTemplate } from "@/entity/Template.entry"
import { ActionDrawer } from "@/functions/actionDrawer"
import { checkChannel } from "@/functions/checkChannel"
import { ActionRowBuilder, ButtonInteraction, ButtonStyle, CacheType, CommandInteraction, EmbedBuilder, ModalSubmitInteraction, SelectMenuBuilder, StringSelectMenuInteraction } from "discord.js"
const template = new Database<TemplateTable>({ table: 'Template' })
interface TicketOptions {
    interaction: CommandInteraction<CacheType> | ModalSubmitInteraction<CacheType> | ButtonInteraction<CacheType> | StringSelectMenuInteraction<CacheType>
}

interface TicketCreate {
    title: string,
    description: string
    channelId: string
    guildId: string
}

interface GenerateButtons {
  messageId?: string
}

export class Template {
  private readonly interaction
  constructor ({ interaction }: TicketOptions) {
    this.interaction = interaction
  }

  async create ({ title, description, channelId, guildId }: TicketCreate) {
    if (!(this.interaction instanceof CommandInteraction)) return
    if (!this.interaction.deferred) await this.interaction.deferReply()
    const channel = await checkChannel(channelId, this.interaction)
    // const cart = new DefaultTicketCart()
    //   .setTitle(this.interaction.guild?.name ?? '')
    //   .setDescription('Teste')
    // const image = await cart.build({ format: 'png' })
    // const attachment = new AttachmentBuilder(image, { name: 'ticketView.png' })

    if (!channel) return

    const embed = new EmbedBuilder({
      title,
      description,
      footer: { text: `Equipe ${this.interaction.guild?.name}`, iconURL: (this.interaction?.guild?.iconURL({ size: 64 }) ?? undefined) }
    })

    const [buttons, select] = await this.genEditButtons({})

    await channel.send({ embeds: [embed], components: [...buttons, ...select] }).then(async (message) => {
      const create = await template.create({
        guild: { id: guildId },
        messageId: message.id,
        channelId: channel.id,
        embed: embed.data
      })
      await template.save(create)
    })
  }

  async genEditButtons ({ messageId }: GenerateButtons): Promise<[ActionRowBuilder<ButtonBuilder>[], ActionRowBuilder<SelectMenuBuilder>[]]> {
    const row: ButtonBuilder[] = [
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

    const rowDevlop = []
  
    if (messageId !== undefined) {
      const templateData = (await template.findOne({ where: { messageId } }))
      const buttonType = {
        SetSelect: TypeTemplate.Select,
        SetButton: TypeTemplate.Button,
        SetModal: TypeTemplate.Modal,
      }

      if (templateData?.type === TypeTemplate.Select) {
        const options: Array<{ label: string, description: string, value: string, emoji: string }> = []

        options.push({ label: 'Editar', description: 'Apenas para Administradores', emoji: '⚙️', value: 'config' })

        console.log(templateData)

        for (const [index, { emoji, title, description }] of Object.entries((templateData.selects ?? []))) {
          options.push({ label: title, description, emoji, value: index })
        }

        rowDevlop.push(new StringSelectMenuBuilder({
          customId: 'EditSelectMenu',
          placeholder: 'Modo edição, escolha um valor para remover',
          options
        }))
      }

      if (templateData !== undefined) {
        for (const button of row) {
          if (!(button instanceof ButtonBuilder)) continue
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

    const buttons = ActionDrawer(row, 5)
    const selects = ActionDrawer(rowDevlop, 1)

    return [buttons, selects]
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
          label: 'Abrir Template',
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