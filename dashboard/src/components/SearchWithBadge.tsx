import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface SearchWithBadgeProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  count: number
  itemLabel?: string
  delay?: string
  inputId?: string
}

export function SearchWithBadge({
  value,
  onChange,
  placeholder = 'Search...',
  count,
  itemLabel = 'item',
  delay = '50ms',
  inputId,
}: SearchWithBadgeProps) {
  return (
    <div className="flex items-center gap-3 animate-slide-up" style={{ animationDelay: delay }}>
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
        <Input
          id={inputId}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Badge variant="outline" className="h-8 px-3">
        {count} {itemLabel}{count !== 1 ? 's' : ''}
      </Badge>
    </div>
  )
}
