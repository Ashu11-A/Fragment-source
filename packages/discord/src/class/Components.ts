import { packageData } from 'utils'
import { type ButtonInteraction, type ChannelSelectMenuInteraction, type MentionableSelectMenuInteraction, type ModalSubmitInteraction, type RoleSelectMenuInteraction, type StringSelectMenuInteraction, type UserSelectMenuInteraction, type CacheType } from 'discord.js'

type ComponentProps<Cached extends CacheType = CacheType> = {
  type: 'Button'
  run: (interaction: ButtonInteraction<Cached>) => Promise<void>
} | {
  type: 'StringSelect'
  run: (interaction: StringSelectMenuInteraction<Cached>) => Promise<void>
} | {
  type: 'RoleSelect'
  run: (interaction: RoleSelectMenuInteraction<Cached>) => Promise<void>
} | {
  type: 'ChannelSelect'
  run: (interaction: ChannelSelectMenuInteraction<Cached>) => Promise<void>
} | {
  type: 'UserSelect'
  run: (interaction: UserSelectMenuInteraction<Cached>) => Promise<void>
} | {
  type: 'MentionableSelect'
  run: (interaction: MentionableSelectMenuInteraction<Cached>) => Promise<void>
} | {
  type: 'Modal'
  run: (interaction: ModalSubmitInteraction<Cached>) => Promise<void>
}

type ComponentData<Cached extends CacheType = CacheType> = ComponentProps<Cached> & {
  cache?: Cached
  customId: string
}

export class Component {
  public static all: ComponentData[] = []

  public static find<Cached extends CacheType, T extends ComponentData['type']>(customId: string, type: T) {
    const component = Component.all.find((component) => component.customId === customId && component.type === type)
    return component as ComponentData<Cached> & { type: T } | undefined
  }

  constructor (data: ComponentData) {
    Component.all.push({
      ...data,
      customId: `${packageData.name}_${data.customId}`
    })
  }
}
