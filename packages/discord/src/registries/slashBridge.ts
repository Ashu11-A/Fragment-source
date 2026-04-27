import { Command, ConstaticApp, type CommandData, type GenericAction } from '@ashu11a/constatic'

/**
 * O bundle do plugin pode carregar outra cópia de `@ashu11a/constatic`, pelo que
 * `instanceof Command` falha; um `export default` com `.action(…, bot)` tem sempre
 * `data.name` no objeto. `CommandData` plano expõe `name` no topo, não `data.name`.
 */
function isExistingCommandInstance (input: unknown): boolean {
  if (input == null || typeof input !== 'object') return false
  if (input instanceof Command) return true
  const data = (input as { data?: { name?: unknown } }).data
  return typeof data?.name === 'string'
}

/**
 * O comando já é uma instância (export default) com a cadeia `.action(…, bot)`.
 * Não fazer `new Command(data)`: o construtor reitera `data.actions` e duplica
 * o registo de todos os `Responder` no `ConstaticApp`.
 */
export function registerPluginCommand (
  input: CommandData<unknown, unknown, Record<string, GenericAction>, unknown> | unknown
): void {
  const app = ConstaticApp.getInstance()
  const cmd = isExistingCommandInstance(input) ? input : new Command(input as never)
  app.commands.set(cmd as never)
}

export function unregisterCommand (commandName: string): void {
  const mgr = ConstaticApp.getInstance().commands as unknown as { collection: Map<string, { data: { type?: number, name: string } }>, runners: Map<string, unknown>, autocompleteRunners: Map<string, unknown> }
  const cmd = mgr.collection.get(commandName)
  if (!cmd) return

  const basePath = `/${cmd.data.type ?? 1}/${cmd.data.name}`

  mgr.collection.delete(commandName)
  mgr.runners.delete(basePath)
  mgr.autocompleteRunners.delete(basePath)

  for (const key of [...mgr.autocompleteRunners.keys()]) {
    if (key.startsWith(`${basePath}/`)) mgr.autocompleteRunners.delete(key)
  }
  for (const key of [...mgr.runners.keys()]) {
    if (key.startsWith(`${basePath}/`)) mgr.runners.delete(key)
  }
}
