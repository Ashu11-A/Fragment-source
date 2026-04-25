import Template from '@/database/entity/Template.entry.js'
import { database } from '@/database'
import { checkURL, Error } from 'discord'
import { ActionRowBuilder, ButtonInteraction, ButtonStyle, Colors, EmbedBuilder, Message, MessageComponentInteraction, type APIEmbed as APIEmbedDiscord, type CommandInteraction, type ModalSubmitInteraction, type StringSelectMenuInteraction } from 'discord.js'
import { BaseInteractionBuilder, type CachedInteraction } from './BaseInteractionBuilder.js'
import { ActionDrawer, ButtonBuilder, StringSelectMenuBuilder } from 'discord'
import { type Properties, type Select, type System, TypeTemplate } from '@/types/entries'

interface TemplateManagerOptions {
  interaction: CachedInteraction
  template?: Template
}

interface APIEmbed {
  title?: string
  description?: string
  color?: string | number
  image?: string
  thumbnail?: string
}

export class TemplateManager extends BaseInteractionBuilder implements Record<'embeds' | 'components', unknown> {
  private options: APIEmbed
  private mode: 'debug' | 'production' = 'production'
  private type: TypeTemplate = TypeTemplate.Button
  private properties: Properties = {}
  private selects: Select[] = []
  private systems: System[] = []
  private switchToggles?: string | string[]
  private data?: Template
  private renderedEmbed?: EmbedBuilder
  private renderedComponents?: (ActionRowBuilder<StringSelectMenuBuilder> | ActionRowBuilder<ButtonBuilder>)[]

  constructor ({ interaction, template }: TemplateManagerOptions) {
    super({ interaction })
    this.options = {
      title: undefined,
      description: undefined,
      image: undefined,
      thumbnail: undefined,
      color: undefined
    }
    if (template !== undefined) {
      this.setData(template)
    }
  }

  setTitle (value: string): this { this.options.title = value; return this }
  setDescription (value: string): this { this.options.description = value; return this }
  setThumbnail (value: string): this { this.options.thumbnail = value; return this }
  setImage (value: string): this { this.options.image = value; return this }
  setColor (value: string): this { this.options.color = value; return this }
  setMode (value: 'debug' | 'production'): this { this.mode = value; return this }
  setType (value: TypeTemplate): this { this.type = value; return this }
  setProperties (elements?: Properties): this { this.properties = elements ?? {}; return this }
  setSystem (elements?: System[]): this { this.systems = elements ?? []; return this }
  setSelects (selects?: Select[]): this { this.selects = selects ?? []; return this }
  switchData (data: string | string[]): this { this.switchToggles = data; return this }

  setData (data: Template): this {
    this.options.title = data.embed.title
    this.options.description = data.embed.description
    this.options.color = data.embed.color
    this.options.image = data.embed.image?.url
    this.options.thumbnail = data.embed.thumbnail?.url
    this.data = data
    this.properties = data.properties ?? {}
    this.selects = data.selects ?? []
    this.systems = data.systems ?? []
    this.type = data.type
    return this
  }

  renderEmbed (original?: APIEmbedDiscord): EmbedBuilder {
    const { color, description, image, thumbnail, title } = this.options
    const embed = new EmbedBuilder(original ?? {})

    if (title !== undefined) embed.setTitle(title)
    if (description !== undefined) embed.setDescription(description)
    if (image !== undefined) embed.setImage(image)
    if (thumbnail !== undefined) embed.setThumbnail(thumbnail)
    if (color !== undefined) embed.setColor(Number(color))

    this.renderedEmbed = embed
    return embed
  }

  renderComponents (): (ActionRowBuilder<StringSelectMenuBuilder> | ActionRowBuilder<ButtonBuilder>)[] {
    const buttons: ButtonBuilder[] = []
    const selects: StringSelectMenuBuilder[] = []

    if (this.mode === 'debug') {
      buttons.push(
        new ButtonBuilder({ customId: 'setTitle', style: ButtonStyle.Secondary, label: 'Nome', emoji: { name: '📝' } }),
        new ButtonBuilder({ customId: 'setDescription', style: ButtonStyle.Secondary, label: 'Descrição', emoji: { name: '📑' } }),
        new ButtonBuilder({ customId: 'setThumbnail', style: ButtonStyle.Secondary, label: 'Miniatura', emoji: { name: '🖼️' } }),
        new ButtonBuilder({ customId: 'setImage', style: ButtonStyle.Secondary, label: 'Banner', emoji: { name: '🌄' } }),
        new ButtonBuilder({ customId: 'setColor', style: ButtonStyle.Secondary, label: 'Cor', emoji: { name: '🎨' } }),
        new ButtonBuilder({ customId: 'SetSelect', style: ButtonStyle.Secondary, label: 'SelectMenu', emoji: { name: '🗄️' } }),
        new ButtonBuilder({ customId: 'AddSelect', style: ButtonStyle.Secondary, label: 'Add Select', emoji: { name: '📝' }, disabled: true }),
        new ButtonBuilder({ customId: 'SetButton', style: ButtonStyle.Secondary, label: 'Botão', emoji: { name: '🔘' } }),
        new ButtonBuilder({ customId: 'SetModal', style: ButtonStyle.Secondary, label: 'Modal', emoji: { name: '📄' } }),
        new ButtonBuilder({ customId: 'Category', label: 'Categoria', emoji: { name: '🔖' }, style: ButtonStyle.Secondary, disabled: true }),
        new ButtonBuilder({ customId: 'MoreDetails', label: 'Mais Detalhes', emoji: { name: '📃' }, style: ButtonStyle.Secondary }),
        new ButtonBuilder({ customId: 'Save', label: 'Salvar', emoji: { name: '✔️' }, style: ButtonStyle.Success }),
        new ButtonBuilder({ customId: 'DeleteTemplate', label: 'Apagar', emoji: { name: '✖️' }, style: ButtonStyle.Danger })
      )
    } else if (this.mode === 'production') {
      switch (this.type) {
        case TypeTemplate.Modal:
        case TypeTemplate.Button:
          buttons.push(
            new ButtonBuilder({ customId: 'Open', label: 'Abrir Ticket', style: ButtonStyle.Success, emoji: { name: '🎫' } }),
            new ButtonBuilder({ customId: 'Config', emoji: { name: '⚙️' }, style: ButtonStyle.Secondary })
          )
          break
        case TypeTemplate.Select:
      }
    }

    const buttonTypeMap: Record<string, TypeTemplate> = {
      SetSelect: TypeTemplate.Select,
      SetButton: TypeTemplate.Button,
      SetModal: TypeTemplate.Modal
    }

    if (this.type === TypeTemplate.Select) {
      const options: Array<{ label: string, description: string, value: string, emoji: string }> = []

      if (this.mode === 'production') {
        options.push({ label: 'Editar', description: 'Apenas para Administradores', emoji: '⚙️', value: 'config' })
      }

      if (this.selects.length > 0) {
        for (const [index, { emoji, title, description }] of Object.entries(this.selects)) {
          options.push({ label: title, description, emoji, value: index })
        }
      }

      if (options.length > 0) {
        selects.push(new StringSelectMenuBuilder({
          customId: this.mode === 'debug' ? 'EditSelectMenu' : 'SelectMenu',
          placeholder: this.mode === 'debug'
            ? 'Modo edição, escolha um valor para remover'
            : 'Selecione o tipo de ticket que deseja abrir',
          options
        }))
      }
    }

    for (const button of buttons) {
      const { customId } = button
      if (customId === undefined) continue

      const mappedType = Object.entries(buttonTypeMap).find(([key]) => key === button.customId)
      if (this.systems.find((mod) => mod.name === button.customId && mod.isEnabled)) button.setStyle(ButtonStyle.Primary)
      if (mappedType?.[0] === customId && this.type === mappedType[1]) button.setStyle(ButtonStyle.Primary)
      if (customId === 'AddSelect' && this.type === TypeTemplate.Select) button.setDisabled(false)
      if (customId === 'Category' && (this.type === TypeTemplate.Button || this.type === TypeTemplate.Modal)) button.setDisabled(false)
      if (customId === 'MoreDetails' && this.type === TypeTemplate.Modal) button.setDisabled(true)
      if (this.properties[customId] === true) button.setStyle(ButtonStyle.Primary)
    }

    this.renderedComponents = [...ActionDrawer(buttons, 5), ...ActionDrawer(selects, 5)]
    return this.renderedComponents
  }

  get embeds (): EmbedBuilder[] | undefined {
    if (this.renderedEmbed === undefined) this.renderEmbed()
    return this.renderedEmbed !== undefined ? [this.renderedEmbed] : undefined
  }

  get components (): (ActionRowBuilder<StringSelectMenuBuilder> | ActionRowBuilder<ButtonBuilder>)[] | undefined {
    if (this.renderedComponents === undefined) this.renderComponents()
    return this.renderedComponents
  }

  async edit ({ messageId }: { messageId: string }): Promise<void> {
    const templateData = this.data !== undefined
      ? this.data
      : await database.template.findOne({ where: { messageId } })

    if (templateData === null) {
      throw await new Error({ element: 'o template', interaction: this.interaction }).notFound({ type: 'Database' }).reply()
    }

    const channel = await this.validateTextChannel(templateData.channelId)
    if (channel === null) return

    const message = await channel.messages.fetch(templateData.messageId)

    if (this.options.color !== undefined && Object.values(Colors).find((color) => color === Number(this.options.color)) === undefined) {
      await new Error({ element: 'cor', interaction: this.interaction }).invalidProperty().reply()
      return
    }

    if (this.switchToggles !== undefined) {
      const toggleList = Array.isArray(this.switchToggles) ? this.switchToggles : [this.switchToggles]
      for (const name of toggleList) {
        const systemIndex = (templateData.systems ?? []).findIndex((system) => system.name === name)
        if (systemIndex !== -1) {
          templateData.systems[systemIndex].isEnabled = !templateData.systems[systemIndex].isEnabled
          continue
        }
        templateData.systems = [...(templateData.systems ?? []), { name, isEnabled: true }]
      }
    }

    if (this.options.image !== undefined) {
      const [isImageUrl] = checkURL(this.options.image)
      if (!isImageUrl) {
        await new Error({ element: 'Image', interaction: this.interaction }).invalidProperty().reply()
        return
      }
    }

    if (this.options.thumbnail !== undefined) {
      const [isThumbUrl] = checkURL(this.options.thumbnail)
      if (!isThumbUrl) {
        await new Error({ element: 'Thumbnail', interaction: this.interaction }).invalidProperty().reply()
        return
      }
    }

    const embed = this.renderEmbed(templateData.embed)
    const components = this.renderComponents()

    templateData.embed = embed.toJSON()
    await database.template.save(templateData)

    if (this.mode !== undefined) {
      await message.edit({ embeds: [embed], components })
      return
    }
    await message.edit({ embeds: [embed] })
  }

  async delete ({ messageId }: { messageId: string }): Promise<void> {
    if (this.interaction instanceof Message) return

    const templateData = await database.template.findOne({ where: { messageId } })
    if (templateData === null) {
      await new Error({ element: 'o template', interaction: this.interaction }).notFound({ type: 'Database' }).reply()
      return
    }

    const channel = await this.validateTextChannel(templateData.channelId)
    if (channel === null) return

    const message = await channel.messages.fetch(templateData.messageId)

    await database.template.delete({ messageId }).then(async (result) => {
      const isCollector = this.interaction instanceof MessageComponentInteraction
      const isDeferred = this.isDeferred

      if ((result?.affected ?? 0) > 0) {
        const embed = new EmbedBuilder({ title: '✅ Template apagado com sucesso!' }).setColor(Colors.Green)

        if (message.deletable) message.delete()
        if (isDeferred) { await (this.interaction as Exclude<typeof this.interaction, Message<true>>).editReply({ embeds: [embed] }); return }
        if (isCollector) { await (this.interaction as ButtonInteraction<'cached'>).update({ embeds: [embed], components: [] }); return }
        await (this.interaction as Exclude<typeof this.interaction, Message<true>>).reply({ embeds: [embed] })
      } else {
        const embed = new EmbedBuilder({ title: '❌ Ocorreu um erro ao tentar apagar o template!' }).setColor(Colors.Red)

        if (isDeferred) { await (this.interaction as Exclude<typeof this.interaction, Message<true>>).editReply({ embeds: [embed] }); return }
        if (isCollector) { await (this.interaction as ButtonInteraction<'cached'>).update({ embeds: [embed], components: [] }); return }
        await (this.interaction as Exclude<typeof this.interaction, Message<true>>).reply({ embeds: [embed] })
      }
    })
  }
}
