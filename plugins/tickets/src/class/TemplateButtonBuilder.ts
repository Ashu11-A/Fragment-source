import { ButtonBuilder, StringSelectMenuBuilder } from "@/discord/base/CustomIntetaction.js";
import { Properties, Select, System, TypeTemplate } from "@/entity/Template.entry.js";
import { ActionDrawer } from "@/functions/actionDrawer.js";
import { ActionRowBuilder, ButtonStyle } from "discord.js";

export class TemplateButtonBuilder {
  private mode: 'production' | 'debug' = 'production'
  private type: TypeTemplate = TypeTemplate.Button
  private properties: Properties = {}
  private selects: Select[] = []
  private system: System[] = []

  setMode(mode: 'production' | 'debug') { this.mode = mode; return this }
  setType(type: TypeTemplate) { this.type = type; return this }
  setProperties(elements?: Properties) { this.properties = elements ?? {}; return this }
  setSystem(elements?: System[]) { this.system = elements ?? []; return this }
  setSelects(selects?: Select[]) { this.selects = selects ?? []; return this }

  render(): (ActionRowBuilder<StringSelectMenuBuilder> | ActionRowBuilder<ButtonBuilder>)[] {
    const buttons: ButtonBuilder[] = []
    const selects: StringSelectMenuBuilder[] = []

    if (this.mode === 'debug') {
      buttons.push(new ButtonBuilder({
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
        customId: 'Category',
        label: 'Categoria',
        emoji: { name: '🔖' },
        style: ButtonStyle.Secondary,
        disabled: true
      }),
      new ButtonBuilder({
        customId: 'MoreDetails',
        label: 'Mais Detalhes',
        emoji: { name: '📃' },
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
      }))
    } else if (this.mode === 'production') {
      switch (this.type) {
      case TypeTemplate.Modal:
      case TypeTemplate.Button:
        buttons.push(
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
    }
    const buttonType = {
      SetSelect: TypeTemplate.Select,
      SetButton: TypeTemplate.Button,
      SetModal: TypeTemplate.Modal,
    }

    if (this.type === TypeTemplate.Select) {
      const options: Array<{ label: string, description: string, value: string, emoji: string }> = []

      if (this.mode === 'production') options.push({ label: 'Editar', description: 'Apenas para Administradores', emoji: '⚙️', value: 'config' })

      if (this.selects.length > 0) {
        for (const [index, { emoji, title, description }] of Object.entries(this.selects )) {
          options.push({ label: title, description, emoji, value: index })
        }
      }

      // Error: Invalid Form Body (if length is 0)
      if (options.length > 0) {
        selects.push(new StringSelectMenuBuilder({
          customId: this.mode === 'debug' ? 'EditSelectMenu' : 'SelectMenu',
          placeholder: this.mode === 'debug' ? 'Modo edição, escolha um valor para remover' : 'Selecione o tipo de ticket que deseja abrir',
          options
        }))
      }
    }
      
    for (const button of buttons) {
      const { customId } = button
      if (customId === undefined) continue
      const ButtonType = Object.entries(buttonType).find(([key]) => key === button.customId ) // [ 'SetModal', 'modal' ]
      if (this.system.find((module) => module.name === button.customId && module.isEnabled)) button.setStyle(ButtonStyle.Primary)
      if (ButtonType?.[0] === customId && this.type === ButtonType[1]) button.setStyle(ButtonStyle.Primary)
      if (customId === 'AddSelect' && this.type === TypeTemplate.Select) button.setDisabled(false)
      if (customId === 'Category' && (this.type === TypeTemplate.Button || this.type === TypeTemplate.Modal)) button.setDisabled(false)
      if (customId === 'MoreDetails' && this.type === TypeTemplate.Modal) button.setDisabled(true)
      if (this.properties[customId] === true) button.setStyle(ButtonStyle.Primary)
    }

    return [...ActionDrawer(buttons, 5), ...ActionDrawer(selects, 5)]
  }
}