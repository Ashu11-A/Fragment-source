import type { Command, Event, ClientEventKey } from '@ashu11a/constatic'
import type { PluginContext } from '@/types/plugin.js'

export function registerCreatedCommand (
  ctx: PluginContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  command: Command<any, any, any, any>
): void {
  /** A instância `Command` (não `command.data`); senão `registerPluginCommand` recria
   * `new Command(data)` e o construtor re-regista todos os `Responder` de `.action()`. */
  ctx.command(command as never)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerCreatedResponder (ctx: PluginContext, responder: { data: any } | any): void {
  ctx.component(responder.data)
}

export function registerCreatedEvent<K extends ClientEventKey> (
  ctx: PluginContext,
  ev: Event<K>
): void {
  ctx.event(ev.data)
}
