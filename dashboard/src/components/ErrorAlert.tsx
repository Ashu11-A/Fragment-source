import { AlertTriangle } from 'lucide-react'
import type { ErrorAlertProps } from '@/types/components'

export function ErrorAlert({ error, variant = 'simple', title = 'Erro' }: ErrorAlertProps) {
  if (!error) return null

  if (variant === 'simple') {
    return (
      <div className="ui-alert-danger p-3 rounded-lg text-sm">
        {error}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm">
      <div className="flex items-start gap-2 text-red-200">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{title}</p>
          <pre className="mt-1 text-xs whitespace-pre-wrap break-words max-h-48 overflow-auto">
            {error}
          </pre>
        </div>
      </div>
    </div>
  )
}
