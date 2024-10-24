import { exists } from '@/functions/fs-extra.js'
import { RootPATH } from '@/index.js'
import { languages } from '@/register.js'
import flags from 'country-code-to-flag-emoji'
import { existsSync, watch } from 'fs'
import { mkdir, writeFile } from 'fs/promises'
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
    const path = join(RootPATH, 'locales')
    const cache = new Map<string, boolean>()

    if (!existsSync(path)) await mkdir(path)
    const watcher = watch(path, { recursive: true })

    watcher.on('change', async () => {
      const language = path.split('/')[path.split('/').length - 2]
  
      i18next.options.backend = {
        backend: join(RootPATH, 'locales', '{{lng}}', '{{ns}}.json'),
      }
  
      cache.set(path, true)
      await i18next.reloadResources(language).finally(() => setTimeout(() => cache.delete(path), 5000))
    })

    for (const lang of Object.keys(languages)) {
      const content = languages[lang]
      const externalPath = join(RootPATH, 'locales', dirname(lang.split('/')[0]), lang)
    
      await mkdir(externalPath, { recursive: true }).catch(() => undefined)
      await writeFile(join(externalPath, '/translation.json'), JSON.stringify(content, null, 2), { encoding: 'utf8' })
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
  
export const i18 = await new Lang().create()
