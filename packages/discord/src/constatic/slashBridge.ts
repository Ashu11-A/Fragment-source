import { ApplicationCommandType } from 'discord.js'
import { ConstaticApp } from '../../../../node_modules/@constatic/base/dist/app.js'
import type { PluginSlashCommandData } from '../registries/slashCommands.js'
import { createCommand } from './creatorsInstance.js'

/**
 * Fragment guarda comandos de plugin em `slashCommands`; o Constatic só envia ao Discord o que
 * estiver em {@link ConstaticApp.getInstance}.commands — reutiliza o mesmo `createCommand` do pacote.
 *
 * `@constatic/base` não exporta `Command`/`ConstaticApp` no entry público; o unload usa `app.js` por caminho de ficheiro.
 */
export function registerPluginSlashCommandInConstatic (
  data: PluginSlashCommandData<boolean> & { pluginId?: string }
): void {
  const { pluginId, autoComplete, ...rest } = data
  void pluginId
  createCommand({
    ...rest,
    ...(autoComplete !== undefined ? { autocomplete: autoComplete } : {}),
  })
}

export function unregisterPluginSlashCommandFromConstatic (commandName: string): void {
  const mgr = ConstaticApp.getInstance().commands
  const cmd = mgr.collection.get(commandName)
  if (!cmd) return

  const type = cmd.data.type ?? ApplicationCommandType.ChatInput
  const basePath = `/${type}/${cmd.data.name}`

  mgr.collection.delete(commandName)
  mgr.runners.delete(basePath)
  mgr.autocompleteRunners.delete(basePath)

  for (const key of [...mgr.autocompleteRunners.keys()]) {
    if (key.startsWith(`${basePath}/`)) {
      mgr.autocompleteRunners.delete(key)
    }
  }
  for (const key of [...mgr.runners.keys()]) {
    if (key.startsWith(`${basePath}/`)) {
      mgr.runners.delete(key)
    }
  }
}
