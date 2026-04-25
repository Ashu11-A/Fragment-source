import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { HeaderContext } from '@tanstack/react-table'

export function createSortableHeader<TData, TValue = unknown>(label: string) {
  return {
    header: ({ column }: HeaderContext<TData, TValue>) => (
      <Button
        variant="ghost"
        size="sm"
        className="h-auto p-0 text-xs font-medium text-surface-500 uppercase tracking-wider hover:text-surface-300 gap-1.5"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        {label}
        {column.getIsSorted() === 'asc' ? (
          <ArrowUp className="w-3 h-3" />
        ) : column.getIsSorted() === 'desc' ? (
          <ArrowDown className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-50" />
        )}
      </Button>
    ),
  }
}
