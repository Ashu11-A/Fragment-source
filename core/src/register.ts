import 'src/discord/commands/lang.js'

import * as ptBR from 'locales/pt-BR/translation.json' assert { type: 'json' }
import * as en from 'locales/en/translation.json' assert { type: 'json' }

export const languages: Record<string, typeof ptBR.default> = { 'pt-BR': ptBR.default, en: en.default } 