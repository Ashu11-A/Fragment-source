/* eslint-disable @typescript-eslint/no-explicit-any */
import type { LangLyrics } from '../types/lang'
import type { Paths, ValueOfLang } from '../types/lyrics'
import type { Lang } from './Lang'

// IDLEGLANCE
export class Lyrics<Music, Languages extends readonly LangLyrics<string, Record<string, unknown>>[]>{
  public languages: Music
  public lang: Lang<Languages>
  constructor(languages: Music, lang: Lang<Languages>) {
    this.lang = lang
    this.languages = languages
  }
  
  get<P extends Paths<Music>>(path: P, metadata?: Record<string, unknown>): ValueOfLang<Music, P> | string {
    const keys = path.split('.')
    const index = this.lang.languages.findIndex((lang) => lang.language === this.lang.language)
    const language = this.lang.languages[index].data
    let result: string | Record<string, string> | object | undefined = undefined

    for (const key of keys) {
      if (result === undefined) {
        result = language[key as keyof typeof language] as Record<string, unknown>
        continue
      }
      if (typeof result === 'object') {
        result = (result as Record<string, any>)[key]
      }
    }

    if (metadata !== undefined) {
      for (const [key, data] of Object.entries(metadata)) {
        if (typeof result === 'string') result = result.replaceAll(`{{${key}}}`, String(data))
      }
    }

    if (result === undefined) console.log(path)

    return result as string
  }
}