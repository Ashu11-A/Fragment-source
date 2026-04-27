import licenseEn from '../../../LICENSE.en.md' with { type: 'text' }
import licensePtBR from '../../../LICENSE.pt-BR.md' with { type: 'text' }
import type { LicenseLanguage } from '@/types/lang'

export const licences = {
  'en': licenseEn,
  'pt-BR': licensePtBR
} as const

export type { LicenseLanguage }
