export * from './controllers/Crypt'
export * from './types/crypt.d'
import { Lang, Lyrics } from 'lang'
import * as ptBR from '../locales/pt-BR/crypt.json' assert { type: 'json' }
import * as en from '../locales/en/crypt.json' assert { type: 'json' }

const languages = [
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

export const credentials = new Map<string, string | object | boolean | number>()