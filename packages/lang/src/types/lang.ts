export type LangOptions<Languages extends Record<string, LangLyrics<Record<string, unknown>>>> = {
  languages: Languages
  language: keyof Languages
}

export type LangLyrics<Content extends Record<string, unknown>> = {
  name: string
  data: Content
}