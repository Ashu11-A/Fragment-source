import { lang, root } from '@/singletons.js'
import type { LicenseLanguage } from '@/types/lang'
import { licences } from '@/utils/licenses'
import { watch } from 'fs'
import { access, constants, readFile, writeFile } from 'fs/promises'
import { join } from 'path'

const REMOTE_BASE_URL = 'https://raw.githubusercontent.com/Ashu11-A/Fragment-source/refs/heads/workspace'

export class License {
  private licensePath = join(root, '.license')
  static watcherInitialized = false

  async checker(): Promise<void> {
    const exists = await access(this.licensePath, constants.F_OK).then(() => true).catch(() => false)

    if (exists) {
      const data = await readFile(this.licensePath, { encoding: 'utf-8' })
      if (!/true/i.test(data)) await this.request()
    } else {
      await this.request()
    }

    if (!License.watcherInitialized) {
      License.watcherInitialized = true
      const watcher = watch(this.licensePath)
      watcher.on('change', () => void this.checker())
    }
  }

  /**
   * Sends `core:license:request` to the server and waits for `bot:license:result`.
   * If the user's dashboard is offline the server queues the request; it will be
   * delivered the next time the user connects.  Re-emits on every reconnect so the
   * flow is resilient to transient connection drops.
   */
  async request(): Promise<void> {
    const { coreSocketManager } = await import('@/events/socket.js')

    await coreSocketManager.waitForConnect()

    const botId = coreSocketManager.activeBotId
    if (botId == null) {
      console.warn('[license] No bot ID configured — skipping license request')
      return
    }

    const text = await this.resolveLicense(lang.language as LicenseLanguage)
    const corePkg = await import('../../package.json', { with: { type: 'json' } })
    const version =
      (corePkg as unknown as { default?: { version?: string }; version?: string }).default?.version ??
      (corePkg as unknown as { version?: string }).version ??
      'unknown'

    const payload = { botId, licenseText: text, language: lang.language as string, version }

    return new Promise<void>((resolve, reject) => {
      let done = false

      const finish = (accepted: boolean) => {
        if (done) return
        done = true
        coreSocketManager.getTypedClient()?.off('bot:license:result')
        if (accepted) {
          void writeFile(this.licensePath, 'ACCEPT=true')
          resolve()
        } else {
          void writeFile(this.licensePath, 'ACCEPT=false')
          reject(new Error(i18('error.no_possible')))
        }
      }

      const onResult = (data: any) => {
        if ((data as { botId: number; accepted: boolean }).botId !== botId) return
        finish((data as { botId: number; accepted: boolean }).accepted)
      }

      const onReconnect = () => {
        if (!done) coreSocketManager.getTypedClient()?.emit('core:license:request', payload)
      }

      const client = coreSocketManager.getTypedClient()
      if (client) {
        client.on('bot:license:result', onResult)
        client.onConnect(onReconnect)
        client.emit('core:license:request', payload)
      } else {
        reject(new Error('Socket client is not available'))
      }
    })
  }

  private async resolveLicense(language: LicenseLanguage): Promise<string> {
    const bundled = licences[language]
    if (bundled !== undefined) return bundled

    try {
      const response = await fetch(`${REMOTE_BASE_URL}/LICENSE.${language}.md`)
      if (response.ok) return await response.text()
    } catch {
      // silent fallback to English
    }

    return licences['en']
  }
}
