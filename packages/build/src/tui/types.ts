import type { ServiceName, ServiceStatus } from '@/types/index'

export type SelectorAction =
  | { readonly kind: 'navigate' }
  | { readonly kind: 'confirm'; readonly selected: readonly ServiceName[] }
  | { readonly kind: 'quit' }
  | { readonly kind: 'none' }

export interface LogEntry {
  readonly source: string
  readonly line: string
}
