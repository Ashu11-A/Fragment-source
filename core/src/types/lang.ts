import type { lang } from '@/singletons'

declare global {
  var i18: typeof lang
}

export type LicenseLanguages = {
  'en': string
  'pt-BR': string
}

export type LicenseLanguage = keyof LicenseLanguages
