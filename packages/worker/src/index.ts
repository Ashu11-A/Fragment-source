import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { Lang, Lyrics } from 'lang'
import * as ptBR from '../locales/pt-BR/worker.json' assert { type: 'json' }
import * as en from '../locales/en/worker.json' assert { type: 'json' }

export const __dirname = dirname(fileURLToPath(import.meta.url))
export const PKG_MODE = __dirname === '/$bunfs/root'

const languages = [
  {
    language: 'pt-BR',
    name: 'worker',
    data: (ptBR as unknown as { default: typeof ptBR }).default
  },
  {
    language: 'en',
    name: 'worker',
    data: (en as unknown as { default: typeof en }).default
  }
] as const


const lang = new Lang({ languages, language: 'en' })
const lyrics = new Lyrics(languages[0].data, lang)
await lang.register()
const i18 = lyrics.get.bind(lyrics)
  
export { lang, i18 }
