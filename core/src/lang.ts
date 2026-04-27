import { Lang, Lyrics } from 'lang'
import en from '../locales/en/core'
import ptBR from '../locales/pt-BR/core'

const languages = {
  'pt-BR': {
    name: 'core',
    data: ptBR
  },
  'en': {
    name: 'core',
    data: en
  }
} as const

const lang = new Lang({ languages, language: 'en' })
const lyrics = new Lyrics(languages[lang.language].data, lang)
const i18 = lyrics.get.bind(lyrics)

global.i18 = i18

export { i18, lang }