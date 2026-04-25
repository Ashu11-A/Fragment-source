import {
  Command as ConstaticCommand,
  Responder,
  type GenericAction,
} from '@ashu11a/constatic'
import { Analyze } from 'url-ast'
import type { ApplicationCommandType, InteractionContextType } from 'discord.js'
import { toPluginComponentPath } from '../utils/pluginComponentPath.js'

export class Command<
  const Type = ApplicationCommandType.ChatInput,
  const Contexts extends readonly InteractionContextType[] = readonly [InteractionContextType.Guild],
  const Actions extends Record<string, GenericAction> = Record<string, never>,
  const Return = void,
> extends ConstaticCommand<Type, Contexts, Actions, Return> {
  public pluginName?: string

  override action<const K extends string, const A extends GenericAction> (
    name: K,
    action: A,
  ): Command<Type, Contexts, Actions & Record<K, A>, Return> {
    const pathStr = toPluginComponentPath(String(action.options.parser))
    const ast = new Analyze(pathStr) as A['ast']
    action.ast = ast
    // Mesmo contrato que `ConstaticCommand.action`; o `Responder` é genérico por tipo de interação.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new (Responder as any)({
      customId: ast.getPathname(),
      types: [action.type],
      run: action.run,
      cache: action.options.cache,
    })
    const bucket = (this.data as { actions?: Record<string, GenericAction> }).actions ??= {}
    bucket[name] = action
    return this as unknown as Command<Type, Contexts, Actions & Record<K, A>, Return>
  }
}
