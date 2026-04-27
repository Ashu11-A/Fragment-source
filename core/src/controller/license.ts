import { root } from '@/singletons.js'
import { watch } from 'fs'
import { access, constants, readFile, writeFile } from 'fs/promises'
import { marked, type MarkedExtension } from 'marked'
import { markedTerminal } from 'marked-terminal'
import { join } from 'path'
import prompt from 'prompts'
import { licences, type LicenseLanguage } from './licenses.js'
import { lang } from '../lang.js'

marked.use(markedTerminal() as MarkedExtension)

const REMOTE_BASE_URL = 'https://raw.githubusercontent.com/Ashu11-A/Fragment-source/refs/heads/workspace'

export class License {
  private licensePath = join(root, '.license')
  static watcherInitialized = false

  async checker(): Promise<void> {
    const exists = await access(this.licensePath, constants.F_OK).then(() => true).catch(() => false)

    if (exists) {
      const data = await readFile(this.licensePath, { encoding: 'utf-8' })
      if (!/true/i.test(data)) await this.ask()
    } else {
      await this.ask()
    }

    if (!License.watcherInitialized) {
      License.watcherInitialized = true
      const watcher = watch(join(root, '.license'))
      watcher.on('change', () => this.checker())
    }
  }

  async ask(): Promise<void> {
    await lang.select()

    const licenseText = await this.resolveLicense(lang.language as LicenseLanguage)

    console.log(marked.parse(licenseText))
    const response = await prompt({
      name: 'accepted',
      type: 'confirm',
      message: i18('license.accept'),
      initial: false,
    })

    await writeFile(join(root, '.license'), response.accepted ? 'ACCEPT=true' : 'ACCEPT=false')

    if (!response.accepted) throw new Error(i18('error.no_possible'))
  }

  private async resolveLicense(language: LicenseLanguage): Promise<string> {
    const bundled = licences[language]
    if (bundled !== undefined) return bundled

    try {
      const response = await fetch(`${REMOTE_BASE_URL}/LICENSE.${language}.md`)
      if (response.ok) return await response.text()
    } catch {
      // Falha silenciosa no fetch; fallback para inglês
    }

    return licences['en']
  }
}
