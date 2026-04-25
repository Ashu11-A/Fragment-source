import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import type { EnvParams } from '../types/env'
import '../types/env.d'

const cwd = process.cwd()
const regex = /^([A-Z0-9_]+)="?([^"\n]*)"?$/gm

export class Env {
  constructor (public options?: EnvParams) {}

  loader () {
    const locale = this.options?.cwd ?? cwd
    const filePath = join(locale, (this.options?.envName ?? '.env'))

    if (!existsSync(filePath)) throw new Error(`The Env file could not be located: ${filePath}`)
    const content = readFileSync(filePath, { encoding: 'utf-8' })

    const matches: { variable: string, value: string | boolean | number }[] = []
    let match: RegExpExecArray | null = null

    while ((match = regex.exec(content)) !== null) {
      const value = this.parser(match[2])
      matches.push({ variable: match[1], value })
    }

    for (const { value, variable } of matches) {
      const serialized = typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value)
      process.env[variable] = serialized
    }

    return matches
  }

  /**
   * Só converte para número quando o valor cabe em inteiro seguro (≤ 2^53-1).
   * IDs do Discord (snowflakes) excedem isso — manter string evita 1108904234222620713 → 1108904234222620700.
   */
  parser (value: string) {
    const trimmed = value.trim()
    if (/^(true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === 'true'
    if (trimmed === '') return value

    const n = Number(trimmed)
    if (
      !Number.isNaN(n)
      && Number.isSafeInteger(n)
      && String(n) === trimmed
    ) {
      return n
    }
    return value
  }
}
