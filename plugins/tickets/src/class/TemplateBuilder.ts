import { Database } from "@/controller/database.js";
import { Error } from "@/discord/base/CustomResponse.js";
import TemplateTable from "@/entity/Template.entry.js";
import { EmbedBuilder } from "@discordjs/builders";
import { APIEmbed as APIEmbedDiscord, ButtonInteraction, CacheType, Colors, CommandInteraction, MessageComponentInteraction, ModalSubmitInteraction, StringSelectMenuInteraction } from "discord.js";
import { TemplateButtonBuilder } from "./TemplateButtonBuilder.js";
import { checkURL } from "@/functions/checker.js";

const database = new Database<TemplateTable>({ table: 'Template' })

type Interaction = CommandInteraction<CacheType> | ModalSubmitInteraction<CacheType> | ButtonInteraction<CacheType> | StringSelectMenuInteraction<CacheType>
interface TemplateBuilderOptions {
    interaction: Interaction
}

interface APIEmbed {
    title: string;
    description: string;
    color: string;
    image: string;
    thumbnail: string;
}


export class TemplateBuilder {
  private readonly interaction: Interaction
  private readonly options!: APIEmbed
  private mode!: 'debug' | 'production'

  constructor ({ interaction }: TemplateBuilderOptions) {
    this.interaction = interaction
    this.options = {
      title: '',
      description: '',
      image: '',
      thumbnail: '',
      color: ''
    }
  }

  setTitle (value: string) { this.options.title = value; return this }
  setDescription (value: string) { this.options.description = value; return this }
  setThumbnail (value: string) { this.options.thumbnail = value; return this }
  setImage (value: string) { this.options.image = value; return this }
  setColor (value: string) { this.options.color = value; return this }
  setMode (value: 'debug' | 'production') { this.mode = value; return this}

  render (original: APIEmbedDiscord): EmbedBuilder {
    const { color, description, image, thumbnail, title } = this.options
    const embed = new EmbedBuilder(original)

    if (title !== '') embed.setTitle(title)
    if (description !== '') embed.setDescription(description)
    if (image !== '') embed.setImage(image)
    if (thumbnail !== '') embed.setThumbnail(thumbnail)
    if (color !== '') embed.setColor(Number(color))

    return embed
  }

  async edit ({ messageId }: { messageId: string }) {
    const buttonBuilder = new TemplateButtonBuilder()
    const templateData = await database.findOne({ where: { messageId } })
    if (templateData === null) { throw await new Error({ element: 'o template', interaction: this.interaction }).notFound({ type: 'Database' }).reply(); return }

    const channel = await this.interaction.guild?.channels.fetch(templateData.channelId)
    if (!channel?.isTextBased()) { await new Error({ element: templateData.channelId, interaction: this.interaction }).notFound({ type: "Channel" }).reply(); return }

    const message = await channel.messages.fetch(templateData.messageId)
    if (!channel?.isTextBased()) { await new Error({ element: templateData.messageId, interaction: this.interaction }).notFound({ type: "Message" }).reply(); return }

    if (Object.values(Colors).find((color) => color === Number(this.options.color)) === undefined) {
      await new Error({ element: 'cor', interaction: this.interaction }).invalidProperty().reply()
      return
    }

    const [isImageURL] = checkURL(this.options.image)
    const [isThumbURL] = checkURL(this.options.thumbnail)

    if (this.options.image !== '' && !isImageURL) {
      await new Error({ element: 'Image', interaction: this.interaction }).invalidProperty().reply()
      return
    }

    if (this.options.thumbnail !== '' && !isThumbURL) {
      await new Error({ element: 'Thumbnail', interaction: this.interaction }).invalidProperty().reply()
      return
    }

    const embed = this.render(templateData.embed)
    const components = buttonBuilder
      .setMode(this.mode ?? 'production')
      .setProperties(templateData.properties)
      .setSelects(templateData.selects)
      .setType(templateData.type)
      .render()

    templateData.embed = embed.toJSON()
    await database.save(templateData)
    await message.edit({ embeds: [embed], components })
  }

  async delete ({ messageId }: { messageId: string }) {
    const templateData = await database.findOne({ where: { messageId } })
    if (templateData === null) { await new Error({ element: 'o template', interaction: this.interaction }).notFound({ type: 'Database' }).reply(); return }

    const channel = await this.interaction.guild?.channels.fetch(templateData.channelId)
    if (!channel?.isTextBased()) { await new Error({ element: templateData.channelId, interaction: this.interaction }).notFound({ type: "Channel" }).reply(); return }

    const message = await channel.messages.fetch(templateData.messageId)
    if (!channel?.isTextBased()) { await new Error({ element: templateData.messageId, interaction: this.interaction }).notFound({ type: "Message" }).reply(); return }

    await database.delete({ messageId }).then(async (result) => {
      const isCollector = this.interaction instanceof MessageComponentInteraction
      const deferred = this.interaction.deferred
      if ((result?.affected ?? 0) > 0) {
        const embed = new EmbedBuilder({ title: '✅ Template apagado com sucesso!' }).setColor(Colors.Green)
        
        if (message.deletable) message.delete()
        if (deferred) { await this.interaction.editReply({ embeds: [embed] }); return }
        if (isCollector) { await this.interaction.update({ embeds: [embed], components: [] }); return }
        await this.interaction.reply({ embeds: [embed] })
      } else {
        const embed = new EmbedBuilder({ title: '❌ Ocorreu um erro ao tentar apagar o template!' }).setColor(Colors.Red)

        if (deferred) { await this.interaction.editReply({ embeds: [embed] }); return }
        if (isCollector) { await this.interaction.update({ embeds: [embed], components: [] }); return }
        await this.interaction.reply({ embeds: [embed] })
      }
    })
  }
}