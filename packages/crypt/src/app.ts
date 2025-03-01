export * from './controllers/Crypt'
export * from './types/crypt.d'
import { Lang, Lyrics } from 'lang'
import ptBR from '../locales/pt-BR/crypt'
import en from '../locales/en/crypt'
import type { DataCrypted } from './app'

const languages = {
  'pt-BR': {
    name: 'crypt',
    data: ptBR
  },
  'en': {
    name: 'crypt',
    data: en
  }
} as const

const lang = new Lang({ languages, language: 'en' })
const lyrics = new Lyrics(languages[lang.language].data, lang)

await lang.register()
const i18 = lyrics.get.bind(lyrics)

export { lang, i18 }
export const credentials = new Map<keyof DataCrypted, DataCrypted[keyof DataCrypted]>()