import flags from 'country-code-to-flag-emoji'
import { existsSync, watch } from 'fs'
import { mkdir, readFile, writeFile } from 'fs/promises'
import { glob } from 'glob'
import { dirname, join } from 'path'
import prompts, { type Choice } from 'prompts'
import { exists } from 'utils'
import type { LangLyrics, LangOptions } from '../types/lang'

export class Lang<Languages extends readonly LangLyrics<string, Record<string, unknown>>[]>{
  public language: Languages[number]['language']
  public languages: Languages
  public paths: Record<string, string> = {}
  public sourcePath: string

  constructor(options: LangOptions<Languages>) {
    this.sourcePath = process.cwd()
    this.languages = options.languages
    this.language = options.language
  }

  /**
   * Recriar os arquivos de lang externamente (do PKG) para possibilitar customizações
   */
  async register () {
    const langPath = join(this.sourcePath, 'locales')
    const cache = new Map<string, boolean>()
    
    if (!existsSync(langPath)) await mkdir(langPath)
    for (const lang of this.languages) {
      const externalPath = join(this.sourcePath, 'locales', dirname(lang.language.split('/')[0]), lang.language)
      
      await mkdir(externalPath, { recursive: true })
      await writeFile(join(externalPath, `/${lang.name}.json`), JSON.stringify(lang.data, null, 2), { encoding: 'utf8' })
    }

    const watcher = watch(langPath, { recursive: true })

    watcher.on('change', async () => {
      cache.set(langPath, true)
      await this.reload()
    })

    return this
  }

  async reload () {
    for (const [lang, path] of Object.entries(this.paths)) {
      (this.languages as Record<string, unknown>)[lang] = JSON.parse(await readFile(path, { encoding: 'utf-8' }))
    }
  }

  
  async set (lang: string) {
    const path = join(this.sourcePath, 'locales', lang)
    
    if (!(await exists(path))) {
      console.log(`⛔ The selected language (${lang}) does not exist, using English by default`)
      this.language = 'en'
      return this.language
    }

    this.language = lang
    return this.language
  }
  
  async select (): Promise<string> {
    const path = join(this.sourcePath, 'locales')
    const allLangs = (await glob('*', { cwd: path })).map((lang) => lang.split('/')[0])
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
    
    await this.set(response.Language)
    return response.Language
  }
}