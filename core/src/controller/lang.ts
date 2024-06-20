import { RootPATH } from '@/index.js'
import { watch } from 'chokidar'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { glob } from 'glob'
import i18next from 'i18next'
import Backend, { FsBackendOptions } from 'i18next-fs-backend'
import { dirname, join } from 'path'
import { exists } from '@/functions/fs-extra.js'
import { __dirname } from '@/index.js'

export class Lang {
  /**
   * Recriar os arquivos de lang externamente (do PKG) para possibilitar customizações
   */
  async register () {
    const path = join(__dirname, '..', 'locales')
    const internalLangs = await glob('**/*.json', { cwd: path })
    const wather = watch(path)
    const cache = new Map<string, boolean>()
    void wather.on('all', async (action, path) => {
      const language = path.split('/')[path.split('/').length - 2]
    
      if (cache.get(path)) return
      switch (action) {
      case 'add': {
        i18next.options.backend = {
          backend: join(RootPATH, 'locales', '{{lng}}', '{{ns}}.json'),
        }
        break
      }
      case 'change':
        cache.set(path, true)
        await i18next.reloadResources(language).finally(() => setTimeout(() => cache.delete(path), 5000))
        break
      }
    })
    for (const lang of internalLangs) {
      const content = await readFile(join(path, lang), { encoding: 'utf8' })
      const externalDir = join(RootPATH, 'locales', dirname(lang.split('/')[0]))
      const externalPath = join(externalDir, lang)
    
      if (!(await exists(externalPath))) {
        await mkdir(externalDir, { recursive: true }).catch(() => undefined)
        await writeFile(externalPath, content, { encoding: 'utf8' })
      }
    }
  }
  async setLanguage (lang: string) {
    const path = join(RootPATH, 'locales', lang)
    if (!(await exists(path))) {
      console.log(`⛔ The selected language (${lang}) does not exist, using English by default`)
      i18next.changeLanguage('en')
      return
    }
    await i18next.changeLanguage(lang)
  }
}



/**
 * Inicializar i18
 */
export const i18 = await i18next.use(Backend).init<FsBackendOptions>({
  debug: false,
  lng: 'en',
  backend: {
    loadPath: join(RootPATH, 'locales', '{{lng}}', '{{ns}}.json'),
  }
})
