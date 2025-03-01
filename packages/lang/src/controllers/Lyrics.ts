/* eslint-disable @typescript-eslint/no-explicit-any */
import type { LangLyrics } from '../types/lang'
import type { ExtractVariables, Paths, ValueOfLang } from '../types/lyrics'
import type { Lang } from './Lang'

// IDLEGLANCE
export class Lyrics<Music, Languages extends Record<string, LangLyrics<Record<string, unknown>>>>{
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
    const language = this.lang.languages[this.lang.language].data
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
    let content = String(result ?? path)

    if (metadata) {
      for (const [key, value] of Object.entries(metadata)) {
        content = content.replaceAll(`{{${key}}}`, String(value))
      }
    }

    return content as ValueOfLang<Music, P>
  }
}