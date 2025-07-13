import { root } from '@/index.js'
import { watch } from 'fs'
import { access, constants, readFile, writeFile } from 'fs/promises'
import { marked, type MarkedExtension } from 'marked'
import { markedTerminal } from 'marked-terminal'
import { join, } from 'path'
import prompt from 'prompts'
import license from '../../../LICENSE.md' with { type: 'text' }

marked.use(markedTerminal() as MarkedExtension)

export class License {
  private licensePath = join(root, '.license')
  static watcherInitialized = false

  async checker () {
    const exist = await access(this.licensePath, constants.F_OK).then(() => true).catch(() => false)
  
    if (exist) {
      const data = await readFile(this.licensePath, { encoding: 'utf-8' })
      const accepted = /true/i.test(data)
      if (!accepted) await this.ask()
    } else await this.ask()

    if (!License.watcherInitialized) {
      License.watcherInitialized = true
      const wather = watch(join(root, '.license'))

      wather.on('change', () => this.checker())
    }
  }

  async ask () {
    console.log(marked.parse(license))
    const response = (await prompt({
      name: 'accepted',
      type: 'confirm',
      message: i18('license.accept'),
      initial: false
    }))

    if (response.accepted) {
      await writeFile(join(root, '.license'), 'ACCEPT=true')
      return
    }

    await writeFile(join(root, '.license'), 'ACCEPT=false')
    throw new Error(i18('error.no_possible'))
  }
}