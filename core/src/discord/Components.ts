import { ButtonInteraction, ChannelSelectMenuInteraction, MentionableSelectMenuInteraction, ModalSubmitInteraction, RoleSelectMenuInteraction, StringSelectMenuInteraction, UserSelectMenuInteraction, type CacheType } from "discord.js"


type ComponentProps<Cached extends CacheType = CacheType> = {
    type: 'Button'
    run: (interaction: ButtonInteraction<Cached>) => {}
  } | {
    type: 'StringSelect'
    run: (interaction: StringSelectMenuInteraction<Cached>) => {}
  } | {
    type: 'RoleSelect'
    run: (interaction: RoleSelectMenuInteraction<Cached>) => {}
  } | {
    type: 'ChannelSelect'
    run: (interaction: ChannelSelectMenuInteraction<Cached>) => {}
  } | {
    type: 'UserSelect'
    run: (interaction: UserSelectMenuInteraction<Cached>) => {}
  } | {
    type: 'MentionableSelect'
    run: (interaction: MentionableSelectMenuInteraction<Cached>) => {}
  } | {
    type: 'Modal'
    run: (interaction: ModalSubmitInteraction<Cached>) => {}
  }


type ComponentData<Cached extends CacheType = CacheType> = ComponentProps<Cached> & {
    cache?: Cached,
    customId: string
}

export class DiscordComponent {
    public static all: Array<ComponentData> = []

    public find<Cached extends CacheType, T extends ComponentData['type']>(customId: string, type: T) {
        const component = DiscordComponent.all.find((component) => component.customId === customId && component.type === type)
        return component as ComponentData<Cached> & { type: T } | undefined
    }

    constructor (data: ComponentData) {
      DiscordComponent.all.push(data)
    }
}