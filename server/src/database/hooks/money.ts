import { Column, type ColumnOptions, type ValueTransformer } from 'typeorm'

const moneyTransformer: ValueTransformer = {
  to(value: unknown): string | null {
    if (value == null) return null

    if (typeof value === 'number') {
      return value.toFixed(2)
    }

    if (typeof value === 'string') {
      const normalized = value.replace(',', '.').trim()
      const parsed = Number.parseFloat(normalized)
      if (!Number.isFinite(parsed)) {
        throw new TypeError(`Invalid money value: ${value}`)
      }
      return parsed.toFixed(2)
    }

    throw new TypeError(`Invalid money value type: ${typeof value}`)
  },
  from(value: unknown): number | null {
    if (value == null) return null
    const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value))
    if (!Number.isFinite(parsed)) {
      throw new TypeError(`Invalid money value from database: ${String(value)}`)
    }
    return parsed
  },
}

type MoneyOptions = Omit<ColumnOptions, 'type' | 'transformer' | 'precision' | 'scale'>

export function Money(options: MoneyOptions = {}): PropertyDecorator {
  return Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: moneyTransformer,
    ...options,
  })
}
