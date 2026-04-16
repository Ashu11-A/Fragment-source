import type {
  ButtonInteraction,
  CacheType,
  ChannelSelectMenuInteraction,
  MentionableSelectMenuInteraction,
  ModalSubmitInteraction,
  RoleSelectMenuInteraction,
  StringSelectMenuInteraction,
  UserSelectMenuInteraction,
} from 'discord.js'

type ComponentProps<Cached extends CacheType = CacheType> =
  | { type: 'Button'; run: (interaction: ButtonInteraction<Cached>) => Promise<void> }
  | { type: 'StringSelect'; run: (interaction: StringSelectMenuInteraction<Cached>) => Promise<void> }
  | { type: 'RoleSelect'; run: (interaction: RoleSelectMenuInteraction<Cached>) => Promise<void> }
  | { type: 'ChannelSelect'; run: (interaction: ChannelSelectMenuInteraction<Cached>) => Promise<void> }
  | { type: 'UserSelect'; run: (interaction: UserSelectMenuInteraction<Cached>) => Promise<void> }
  | { type: 'MentionableSelect'; run: (interaction: MentionableSelectMenuInteraction<Cached>) => Promise<void> }
  | { type: 'Modal'; run: (interaction: ModalSubmitInteraction<Cached>) => Promise<void> }

/** Component handlers registered via `ctx.component` (legacy path alongside `createResponder`). */
export type PluginComponentData<Cached extends CacheType = CacheType> = ComponentProps<Cached> & {
  cache?: Cached
  customId: string
  pluginId?: string
}

export const interactionComponents: PluginComponentData[] = []
