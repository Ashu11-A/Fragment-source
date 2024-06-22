import { exists } from '@/functions/fs-extra.js'
import { __dirname, RootPATH } from '@/index.js'
import { watch } from 'chokidar'
import flags from 'country-code-to-flag-emoji'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { glob } from 'glob'
import i18next from 'i18next'
import Backend, { FsBackendOptions } from 'i18next-fs-backend'
import { dirname, join } from 'path'
import prompts, { Choice } from 'prompts'
import { Crypt } from './crypt.js'

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

  
  async setLanguage (lang: string, change?: boolean) {
    const path = join(RootPATH, 'locales', lang)
    const crypt = new Crypt()
    
    if (!(await exists(path))) {
      console.log(`⛔ The selected language (${lang}) does not exist, using English by default`)
      if (change) await crypt.write({ language: 'en' })
      i18next.changeLanguage('en')
      return
    }
    await i18next.changeLanguage(lang).then(async () => { 
      if (change) await crypt.write({ language: lang })
    })
  }
  
  async selectLanguage () {
    const path = join(RootPATH, 'locales')
    const allLangs = (await glob('**/*.json', { cwd: path })).map((lang) => lang.split('/')[0])
    const langs = []
    for (const lang of allLangs) {
      if (langs.filter((langExist) => langExist === lang).length == 0) langs.push(lang)
    }
    const choices: Choice[] = langs.map((lang) => ({ title: `${flags(lang)} - ${lang}`, value: lang } satisfies Choice))
    const response = await prompts({
      name: 'Language',
      type: 'select',
      choices,
      message: 'Which language should I continue with?',
      initial: 1
    })
    if (response.Language === undefined) throw new Error('Please select a language')
      
    this.setLanguage(response.Language, true)
  }
  /**
   * Inicializar i18
  */
  async create () {
    return await i18next.use(Backend).init<FsBackendOptions>({
      debug: false,
      lng: 'en',
      backend: {
        loadPath: join(RootPATH, 'locales', '{{lng}}', '{{ns}}.json'),
      }
    })

  }
}
  
