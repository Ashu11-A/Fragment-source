import { Lang, Lyrics } from 'lang'

import { storage } from '.'
import * as en from '../locales/en/core.json' assert { type: 'json' }
import * as ptBR from '../locales/pt-BR/core.json' assert { type: 'json' }

export const languages = [
  {
    language: 'pt-BR',
    name: 'core',
    data: (ptBR as unknown as { default: typeof ptBR }).default
  },
  {
    language: 'en',
    name: 'core',
    data: (en as unknown as { default: typeof en }).default
  }
] as const

export const { i18, lang } = await (async () => {
  const lang = new Lang({ languages, language: 'en' })
  const lyrics = new Lyrics(languages[0].data, lang)
  await lang.register()
  const i18 = lyrics.get.bind(lyrics)

  return { lang, i18 }
})()

global.i18 = i18

const data = await storage.read()

if (data?.language === undefined) {
  const language = await lang.select()
  await storage.write({ language })
}