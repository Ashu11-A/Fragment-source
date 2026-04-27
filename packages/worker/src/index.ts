import { Lang, Lyrics } from 'lang'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import en from '../locales/en/worker'
import ptBR from '../locales/pt-BR/worker'

export const __dirname = dirname(fileURLToPath(import.meta.url))
export const PKG_MODE = __dirname.includes('B:\\~BUN\\') || __dirname.includes('/$bunfs/root')

const languages = {
  'pt-BR': {
    name: 'worker',
    data: ptBR
  },
  'en': {
    name: 'worker',
    data: en
  }
} as const

const lang = new Lang({ languages, language: 'en' })
const lyrics = new Lyrics(languages[lang.language].data, lang)
const i18 = lyrics.get.bind(lyrics)
  
export { i18, lang }

