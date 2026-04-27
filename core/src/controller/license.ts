import { root } from '@/singletons.js'
import { watch } from 'fs'
import { access, constants, readFile, writeFile } from 'fs/promises'
import { marked, type MarkedExtension } from 'marked'
import { markedTerminal } from 'marked-terminal'
import { join } from 'path'
import prompt from 'prompts'
import license from '../../../LICENSE.md' with { type: 'text' }

marked.use(markedTerminal() as MarkedExtension)

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
    console.log(marked.parse(license))
    const response = await prompt({
      name: 'accepted',
      type: 'confirm',
      message: i18('license.accept'),
      initial: false,
    })

    await writeFile(join(root, '.license'), response.accepted ? 'ACCEPT=true' : 'ACCEPT=false')

    if (!response.accepted) throw new Error(i18('error.no_possible'))
  }
}
