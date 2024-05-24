import { Database } from "@/controller/database"
import { ButtonBuilder } from "@/discord/base/CustomIntetaction"
import Template from "@/entity/Template.entry"
import { ActionDrawer } from "@/functions/actionDrawer"
import { checkChannel } from "@/functions/checkChannel"
import { ActionRowBuilder, ButtonStyle, CacheType, CommandInteraction, EmbedBuilder, ModalSubmitInteraction } from "discord.js"

interface TicketOptions {
    interaction: CommandInteraction<CacheType> | ModalSubmitInteraction<CacheType>
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

    const components = await this.generateButtons({})

    await channel.send({ embeds: [embed], components }).then(async (message) => {
      const create = await template.create({
        messageId: message.id,
        channelId: channel.id,
        embed: embed.data
      })
      await template.save(create)
    })
  }

  async generateButtons ({ messageId }: GenerateButtons): Promise<ActionRowBuilder<ButtonBuilder>[]> {
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
        customId: 'EmbedCategory',
        label: 'Panel Category',
        emoji: { name: '🖥️' },
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
      const template = new Database<Template>({ table: 'Template' })
      const properties = (await template.findOne({ where: { messageId } }))?.properties

      if (properties !== undefined) {
        for (const button of row) {
          const { customId } = button

          if (properties?.[customId] === true) {
            button.setStyle(ButtonStyle.Primary)
          }
        }
      }

    }

    return ActionDrawer(row, 5)
  }
}