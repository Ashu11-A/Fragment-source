import { Bot, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Bot } from 'lucide-react'
import type { BotNotFoundProps } from '@/types/components'

export function BotNotFound({
  title = 'Bot not found',
  message = "The bot you are looking for does not exist or you don't have access.",
  retryLabel = 'Try again',
  onRetry,
}: BotNotFoundProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Bot className="w-12 h-12 text-surface-600 mb-4" />
      <h2 className="text-xl font-bold text-[color:var(--text-primary)]">{title}</h2>
      <p className="text-surface-400 text-sm mt-1">{message}</p>
      {onRetry && (
        <Button variant="ghost" size="sm" className="mt-4 gap-1.5" onClick={onRetry}>
          <RefreshCw className="w-4 h-4" /> {retryLabel}
        </Button>
      )}
    </div>
  )
}
