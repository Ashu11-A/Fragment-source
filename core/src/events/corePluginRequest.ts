import { ClientEvent, fragmentSocketContract } from 'socket'
import { basename } from 'node:path'
import { Plugin } from 'worker'
import { z } from 'zod'

type PluginResult = z.infer<typeof fragmentSocketContract.clientToServer['core:plugin:result']>
type PluginEntry = NonNullable<PluginResult['plugins']>[number]

export const corePluginRequest = new ClientEvent({
  name: 'core:plugin:request',
  async onRun({ data: req, socket }) {
    const { plugin } = await import('../app.js')

    const send = (payload: PluginResult) => socket.emit('core:plugin:result', payload)
    const fail = (message: string, details?: string) =>
      send({ requestId: req.requestId, ok: false, action: req.action, message, details })

    try {
      if (req.action === 'list') {
        const loaded: PluginEntry[] = [...Plugin.all.values()].map((e) => ({
          pluginName: e.pluginName,
          filePath: e.fileURL,
          version: e.manager.metadata.version,
          description: e.manager.metadata.description ?? null,
          loaded: true,
        }))

        const discovered = await plugin.listDiscoveredBundlePaths()
        const loadedPaths = new Set(loaded.map((r) => r.filePath))
        for (const p of discovered) {
          if (!loadedPaths.has(p)) {
            loaded.push({ pluginName: basename(p, '.js'), filePath: p, loaded: false })
          }
        }
        loaded.sort((a, b) => a.pluginName.localeCompare(b.pluginName))

        send({ requestId: req.requestId, ok: true, action: 'list', plugins: loaded })
        return
      }

      if (req.action === 'reload' || req.action === 'load') {
        const r = await plugin.register(req.filePath)
        if (r.ok) {
          send({ requestId: req.requestId, ok: true, action: req.action, pluginName: r.pluginName, filePath: r.filePath })
        } else {
          fail(r.error, r.details)
        }
        return
      }

      if (req.action === 'unload') {
        await plugin.unload(req.pluginName)
        send({ requestId: req.requestId, ok: true, action: 'unload', pluginName: req.pluginName })
      }
    } catch (err) {
      fail(err instanceof Error ? err.message : String(err), err instanceof Error ? err.stack : undefined)
    }
  },
})
