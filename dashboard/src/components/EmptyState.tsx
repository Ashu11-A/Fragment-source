import { Card } from '@/components/ui/card'
import type { EmptyStateProps } from '@/types/components'

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <div className="ui-icon-placeholder w-16 h-16 mb-4">
        <Icon className="w-8 h-8 text-surface-500" />
      </div>
      <p className="text-surface-400 text-sm font-medium">{title}</p>
      {description && <p className="text-surface-600 text-xs mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </Card>
  )
}
