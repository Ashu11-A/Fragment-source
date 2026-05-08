export type BotPluginCatalogItem = {
  id: number
  name: string
  assigned: boolean
}

export function parseBotRouteId(botId: string | number | undefined) {
  if (botId === undefined) return { id: undefined as number | undefined, isValid: false }
  const parsedId = typeof botId === 'string' ? Number.parseInt(botId, 10) : botId
  return { id: parsedId, isValid: Number.isInteger(parsedId) && parsedId > 0 }
}

export function filterPluginsByName<TPlugin extends BotPluginCatalogItem>(
  plugins: readonly TPlugin[],
  search: string,
) {
  const normalizedSearch = search.trim().toLowerCase()
  if (normalizedSearch.length === 0) return [...plugins]
  return plugins.filter((plugin) => plugin.name.toLowerCase().includes(normalizedSearch))
}

export function countAssignedPlugins<TPlugin extends BotPluginCatalogItem>(plugins: readonly TPlugin[]) {
  return plugins.reduce((totalAssigned, plugin) => (plugin.assigned ? totalAssigned + 1 : totalAssigned), 0)
}
