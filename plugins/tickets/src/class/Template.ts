import { Database } from "@/controller/database.js"
import TemplateTable, { TypeTemplate } from "@/entity/Template.entry.js"
import { checkChannel } from "@/functions/checkChannel.js"
import { ButtonInteraction, CacheType, CommandInteraction, EmbedBuilder, ModalSubmitInteraction, StringSelectMenuInteraction } from "discord.js"
import { TemplateButtonBuilder } from "./TemplateButtonBuilder.js"
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

    const buttonBuilder = new TemplateButtonBuilder()
    const components = buttonBuilder
      .setMode('debug')
      .setType(TypeTemplate.Button)
      .render()

    await channel.send({ embeds: [embed], components }).then(async (message) => {
      const create = await template.create({
        guild: { guildId },
        messageId: message.id,
        channelId: channel.id,
        embed: embed.data,
      })
      await template.save(create)
    })
  }
}