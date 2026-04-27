import {
  ActionRowBuilder,
  ButtonBuilder as DjsButtonBuilder,
  ButtonStyle,
  ModalBuilder as DjsModalBuilder,
  StringSelectMenuBuilder as DjsStringSelectMenuBuilder,
  type AnyComponentBuilder,
  type APIMessageComponentEmoji,
} from 'discord.js'
import { toPluginComponentPath } from '@/utils/pluginComponentPath.js'
import type { ButtonComponentData, ModalBuilderData, StringSelectMenuData } from '@/types/components.js'

/** Botão com `customId` alinhado ao plugin, ex. `/ticket/Switch` a partir de sufixo `Switch`. */
export class ButtonBuilder extends DjsButtonBuilder {
  public readonly customId?: string
  constructor ({ customId, style, label, disabled, emoji, url }: ButtonComponentData) {
    super()
    this.customId = customId
    this.setStyle(style)
    this.setDisabled(disabled ?? false)
    if (url === undefined) this.setCustomId(toPluginComponentPath(customId!))
    else this.setURL(url)
    if (label) this.setLabel(label)
    if (emoji) this.setEmoji(emoji)
  }
}

/** Modal com o mesmo esquema de path que `Button`/`Responder` (ver `toPluginComponentPath`). */
export class ModalBuilder extends DjsModalBuilder {
  constructor ({ components, customId, title }: ModalBuilderData) {
    super()
    this.setTitle(title)
    if (components) this.setComponents(components)
    this.setCustomId(toPluginComponentPath(customId))
  }
}

/** Select de string com `customId` prefixado pelo nome do plugin. */
export class StringSelectMenuBuilder extends DjsStringSelectMenuBuilder {
  constructor ({ customId, options, disabled, maxValues, minValues, placeholder }: StringSelectMenuData) {
    super()
    this.setOptions(options)
    this.setCustomId(toPluginComponentPath(customId))
    if (disabled) this.setDisabled(disabled)
    if (maxValues) this.setMaxValues(maxValues)
    if (minValues) this.setMinValues(minValues)
    if (placeholder) this.setPlaceholder(placeholder)
  }
}

/** Distribui componentes em ActionRows de até `lines` itens cada. */
export function ActionDrawer<T extends AnyComponentBuilder>(rows: T[], lines = 5): ActionRowBuilder<T>[] {
  const actions: ActionRowBuilder<T>[] = []
  let current: ActionRowBuilder<T> = new ActionRowBuilder<T>()
  for (let i = 0; i < rows.length; i++) {
    if (i % lines === 0) {
      current = new ActionRowBuilder<T>()
      actions.push(current)
    }
    current.addComponents(rows[i])
  }
  return actions
}

/** Cria um botão de link de redirecionamento para um canal. */
export function buttonRedirect(options: {
  guildId: string | null
  channelId?: string
  emoji?: APIMessageComponentEmoji
  label: string
}): ActionRowBuilder<DjsButtonBuilder> {
  const { guildId, channelId, emoji, label } = options
  return new ActionRowBuilder<DjsButtonBuilder>().addComponents(
    new DjsButtonBuilder({
      emoji,
      label,
      url: `https://discord.com/channels/${guildId}/${channelId}`,
      style: ButtonStyle.Link,
    }),
  )
}
