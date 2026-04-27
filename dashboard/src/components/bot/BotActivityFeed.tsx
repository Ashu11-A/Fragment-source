import { Clock, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { ActivityFilter, BotActivityFeedProps } from '@/types/components'

const FILTER_OPTIONS: { id: ActivityFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'success', label: 'Success' },
  { id: 'info', label: 'Info' },
  { id: 'error', label: 'Errors' },
]

export function BotActivityFeed({
  title,
  filteredRows,
  formatRelativeTime,
  isLoading,
  onRefetch,
  filter,
  onFilterChange,
  showLiveBadge = true,
  maxHeightClass,
}: BotActivityFeedProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{title}</CardTitle>
            {showLiveBadge ? (
              <Badge variant="outline" className="text-[10px] font-normal text-surface-500 border-surface-700">
                Live
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1.5 items-center">
            {FILTER_OPTIONS.map((opt) => (
              <Button
                key={opt.id}
                variant={filter === opt.id ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => onFilterChange(opt.id)}
              >
                {opt.label}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => void onRefetch()}
              title="Reload history"
            >
              <RefreshCw className="w-3 h-3" />
              Sync
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className={
            maxHeightClass
              ? `space-y-4 overflow-y-auto pr-1 ${maxHeightClass}`
              : 'space-y-4'
          }
        >
          {filteredRows.length === 0 ? (
            <p className="text-sm text-surface-500 py-6 text-center">
              {isLoading
                ? 'Loading activity…'
                : 'No activity yet. Start the core for this bot to stream logs here.'}
            </p>
          ) : (
            filteredRows.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 pb-4 border-b border-surface-800/50 last:border-0 last:pb-0"
              >
                <div
                  className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                    log.display === 'success'
                      ? 'ui-activity-success'
                      : log.display === 'error'
                        ? 'ui-activity-error'
                        : 'ui-activity-info'
                  }`}
                />
                <div className="space-y-1 flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-200 break-words">{log.message}</p>
                  <p className="text-xs text-surface-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3 shrink-0" /> {formatRelativeTime(log.createdAt)}
                    </span>
                    <span className="text-surface-600">·</span>
                    <span className="font-mono text-[10px] uppercase tracking-wide text-surface-500">
                      {log.category}
                    </span>
                    <span className="text-surface-600">·</span>
                    <span className="font-mono text-[10px] text-surface-600">{log.level}</span>
                    {log.source ? (
                      <>
                        <span className="text-surface-600">·</span>
                        <span className="text-[10px] text-surface-600 truncate max-w-[180px]" title={log.source}>
                          {log.source}
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
