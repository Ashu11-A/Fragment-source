 

import type { i18 as lang } from '@/lang'

declare global {
  var i18: typeof lang

  interface globalThis {
    i18: typeof lang
  }
}