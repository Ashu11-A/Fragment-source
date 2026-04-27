import flags from 'country-code-to-flag-emoji'
import prompts, { type Choice } from 'prompts'
import type { LangLyrics, LangOptions } from '@/types/lang'

export class Lang<Languages extends Record<string, LangLyrics<Record<string, unknown>>>> {
  public language: keyof Languages
  public languages: Languages

  constructor(options: LangOptions<Languages>) {
    this.languages = options.languages
    this.language = options.language
  }

  set(lang: string): keyof Languages {
    if (!(lang in this.languages)) {
      console.log(`⛔ The selected language (${lang}) does not exist, using English by default`)
      this.language = 'en' as keyof Languages
      return this.language
    }
    this.language = lang as keyof Languages
    return this.language
  }

  async select(): Promise<string> {
    const langs = Object.keys(this.languages)
    const choices: Choice[] = langs.map((lang) => ({ title: `${flags(lang)} - ${lang}`, value: lang } satisfies Choice))
    const response = await prompts({
      name: 'Language',
      type: 'select',
      choices,
      message: 'Which language should I continue with?',
      initial: 1,
    })

    if (response.Language === undefined) throw new Error('Please select a language')
    this.set(response.Language as string)
    return response.Language as string
  }
}
