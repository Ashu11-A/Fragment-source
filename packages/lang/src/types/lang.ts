export type LangOptions<Languages extends readonly LangLyrics<string, Record<string, unknown>>[]> = {
  languages: Languages
  language: Languages[number]['language']
}

export type LangLyrics<Language extends string, Content extends Record<string, unknown>> = {
  name: string
  language: Language
  data: Content
}