/* eslint-disable @typescript-eslint/no-explicit-any */
import type { LangLyrics } from '../types/lang'
import type { ExtractVariables, Paths, ValueOfLang } from '../types/lyrics'
import type { Lang } from './Lang'

// IDLEGLANCE
export class Lyrics<Music, Languages extends readonly LangLyrics<string, Record<string, unknown>>[]>{
  public languages: Music
  public lang: Lang<Languages>
  constructor(languages: Music, lang: Lang<Languages>) {
    this.lang = lang
    this.languages = languages
  }
  
  get<P extends Paths<Music>>(
    path: P,
    ...args: ValueOfLang<Music, P> extends string
      ? ExtractVariables<ValueOfLang<Music, P>> extends never
        ? [metadata?: undefined]
        : [metadata: Record<ExtractVariables<ValueOfLang<Music, P>>, unknown>]
      : []
  ): ValueOfLang<Music, P> {
    const keys = path.split('.')
    const index = this.lang.languages.findIndex((lang) => lang.language === this.lang.language)
    const language = this.lang.languages[index].data
    let result: unknown = undefined

    for (const key of keys) {
      if (result === undefined) {
        result = language[key as keyof typeof language]
        continue
      }
      if (typeof result === 'object') {
        result = (result as Record<string, any>)[key]
      }
    }

    const metadata = args[0] ?? {}
    let finalString = String(result ?? path)

    if (metadata) {
      for (const [key, value] of Object.entries(metadata)) {
        finalString = finalString.replaceAll(`{{${key}}}`, String(value))
      }
    }

    return finalString as ValueOfLang<Music, P>
  }
}