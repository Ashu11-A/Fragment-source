import type { Command, Event, Responder } from '@constatic/base'
import { ResponderType } from '@constatic/base'
import {
  ApplicationCommandType,
  type AutocompleteInteraction,
  type CacheType,
  type ClientEvents,
  type Interaction,
  type InteractionContextType,
} from 'discord.js'
import type { PluginComponentData } from '../registries/components.js'
import type { PluginSlashCommandData } from '../registries/slashCommands.js'
import type { PluginContext } from '../types/plugin.js'

const responderTypeToPlugin: Record<ResponderType, PluginComponentData['type']> = {
  [ResponderType.Button]: 'Button',
  [ResponderType.StringSelect]: 'StringSelect',
  [ResponderType.UserSelect]: 'UserSelect',
  [ResponderType.RoleSelect]: 'RoleSelect',
  [ResponderType.ChannelSelect]: 'ChannelSelect',
  [ResponderType.MentionableSelect]: 'MentionableSelect',
  [ResponderType.Modal]: 'Modal',
  [ResponderType.ModalComponent]: 'Modal',
}

/**
 * Registra um `Command` criado com `createCommand` no `PluginContext` (registro Fragment / core).
 */
export function registerCreatedCommand (
  ctx: PluginContext,
  command: Command<ApplicationCommandType, readonly InteractionContextType[], unknown>
): void {
  const { data } = command
  const { autocomplete, run, ...rest } = data
  if (!run) {
    throw new Error(`Command "${data.name}" must define run() for plugin registration`)
  }

  const dm = data.dmPermission ?? false
  const t = data.type ?? ApplicationCommandType.ChatInput

  if (t === ApplicationCommandType.ChatInput) {
    ctx.command({
      ...rest,
      type: ApplicationCommandType.ChatInput,
      description: data.description ?? data.name,
      dmPermission: dm,
      run: run as Extract<PluginSlashCommandData<boolean>, { type: ApplicationCommandType.ChatInput }>['run'],
      autoComplete: autocomplete
        ? (interaction: AutocompleteInteraction) => autocomplete(interaction)
        : undefined,
    } as PluginSlashCommandData<boolean>)
    return
  }
  if (t === ApplicationCommandType.User) {
    ctx.command({
      ...rest,
      type: ApplicationCommandType.User,
      dmPermission: dm,
      run: run as Extract<PluginSlashCommandData<boolean>, { type: ApplicationCommandType.User }>['run'],
    } as PluginSlashCommandData<boolean>)
    return
  }
  ctx.command({
    ...rest,
    type: ApplicationCommandType.Message,
    dmPermission: dm,
    run: run as Extract<PluginSlashCommandData<boolean>, { type: ApplicationCommandType.Message }>['run'],
  } as PluginSlashCommandData<boolean>)
}

/**
 * Registra um `Responder` criado com `createResponder` no `PluginContext`.
 */
export function registerCreatedResponder<Path extends string, const Types extends readonly ResponderType[], Parsed, Cache extends CacheType> (
  ctx: PluginContext,
  responder: Responder<Path, Types, Parsed, Cache>
): void {
  const { data } = responder
  const types = data.types
  const primaryType = types?.[0]
  if (primaryType === undefined) {
    throw new Error(
      `Responder "${String(data.customId)}" must set types: [ResponderType.*] (createResponder from @constatic/base). ` +
        'Do not use a single `type` string — see Constatic ResponderData.'
    )
  }

  ctx.component({
    type: responderTypeToPlugin[primaryType],
    customId: data.customId,
    cache: data.cache,
    run: async (interaction: Interaction) => {
      await data.run(interaction as never, undefined as never)
    },
  } as PluginComponentData)
}

/**
 * Registra um `Event` criado com `createEvent` no `PluginContext`.
 */
export function registerCreatedEvent<K extends keyof ClientEvents> (
  ctx: PluginContext,
  ev: Event<K>
): void {
  const { data } = ev
  ctx.event({
    name: data.event,
    once: data.once,
    run: (...args: ClientEvents[K]) => {
      void data.run(...args)
    },
  })
}
