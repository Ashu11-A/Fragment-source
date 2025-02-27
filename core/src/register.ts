import { Lang, Lyrics } from 'lang'

import { storage } from '.'
import en from '../locales/en/core'
import ptBR from '../locales/pt-BR/core'

export const languages = [
  {
    language: 'pt-BR',
    name: 'core',
    data: ptBR
  },
  {
    language: 'en',
    name: 'core',
    data: en
  }
] as const

const lang = new Lang({ languages, language: 'en' })
const lyrics = new Lyrics(languages[0].data, lang)
  
await lang.register()
const i18 = lyrics.get.bind(lyrics)


export { i18, lang }
global.i18 = i18

const data = await storage.read()

if (data?.language === undefined) {
  const language = await lang.select()
  await storage.write({ language })
}