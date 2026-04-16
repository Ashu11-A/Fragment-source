import type { Category, Select } from '@/types/entries'

export const userSelect = new Map<string, { category: Category; templateId: number }>()
export const cacheSelectMenu = new Map<string, Select>()
