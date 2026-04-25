import { useParams } from '@tanstack/react-router'
import { useBot } from '@/hooks/useBots'
import { useBotActivity } from '@/hooks/useBotActivity'
import { useBotDetailStore } from '@/stores/botDetailStore'
import { Activity, Wifi, WifiOff, HardDrive, Cpu, Plug, Bot } from 'lucide-react'
import { BotActivityFeed } from '@/components/bot/BotActivityFeed'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { BotNotFound } from '@/components/ui/BotNotFound'
import { IconTile } from '@/components/ui/IconTile'
import { formatDate } from '@/lib/format-utils'

export function BotDashboardPage() {
  const { botId } = useParams({ strict: false }) as { botId: string }
  const { bot, isOnline, isLoading, isError, isFetching, refetch } = useBot(botId)
  const { recentActivityFilter, setRecentActivityFilter } = useBotDetailStore()

  const numericBotId = bot?.id
  const {
    rows: activityRowsRaw,
    formatRelativeTime,
    isLoading: activityLoading,
    refetch: refetchActivity,
  } = useBotActivity(numericBotId, Boolean(bot), { historyLimit: 5, maxRows: 5 })

  const activityRows =
    recentActivityFilter === 'all'
      ? activityRowsRaw
      : activityRowsRaw.filter((a) => a.display === recentActivityFilter)

  if (isLoading) {
    return <LoadingSpinner text="Loading bot details..." />
  }

  if (!bot || isError) {
    return <BotNotFound onRetry={() => refetch()} />
  }

  return (
    <div className="space-y-6 max-w-7xl animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="ui-avatar-wrap relative flex items-center justify-center w-16 h-16">
            <IconTile icon={Bot} size="lg" variant="bots" />
            <div
              className={`ui-tile-avatar-outline absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-[3px] ${
                isOnline ? 'ui-status-dot' : 'ui-status-dot-off'
              }`}
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">{bot.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={isOnline ? 'badge-success-soft' : 'text-surface-400'}>
                {isOnline ? (
                  <span className="flex items-center gap-1.5"><Wifi className="w-3 h-3" /> Online</span>
                ) : (
                  <span className="flex items-center gap-1.5"><WifiOff className="w-3 h-3" /> Offline</span>
                )}
              </Badge>
              <span className="text-sm text-surface-500">
                Created {formatDate(bot.createdAt)}
              </span>
            </div>
          </div>
        </div>
        {(isFetching || activityLoading) && (
          <span className="text-xs text-surface-500 flex items-center gap-1.5" title="Refreshing data">
            <Activity className="w-3.5 h-3.5 text-blurple-400 animate-spin" />
            Updating…
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-surface-400 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-blurple-400" />
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[color:var(--text-primary)]">{bot.enabled ? 'Active' : 'Inactive'}</div>
            <p className="text-xs text-surface-500 mt-1">Bot process status</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-surface-400 uppercase tracking-wider flex items-center gap-2">
              <Plug className="w-4 h-4 text-emerald-400" />
              Active Plugins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[color:var(--text-primary)]">3</div>
            <p className="text-xs text-surface-500 mt-1">Total enabled plugins</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-surface-400 uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-400" />
              CPU Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[color:var(--text-primary)]">2.4%</div>
            <p className="text-xs text-surface-500 mt-1">Last 5 minutes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-surface-400 uppercase tracking-wider flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-rose-400" />
              Memory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[color:var(--text-primary)]">142 MB</div>
            <p className="text-xs text-surface-500 mt-1">Out of 512 MB allocated</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <BotActivityFeed
            title="Recent Activity"
            filteredRows={activityRows}
            formatRelativeTime={formatRelativeTime}
            isLoading={activityLoading}
            onRefetch={refetchActivity}
            filter={recentActivityFilter}
            onFilterChange={setRecentActivityFilter}
          />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <button
                type="button"
                className="ui-quick-action w-full flex items-center justify-between p-3 rounded-lg transition-colors text-sm font-medium"
              >
                Restart Bot
                <Activity className="w-4 h-4 text-surface-400" />
              </button>
              <button
                type="button"
                className="ui-quick-action w-full flex items-center justify-between p-3 rounded-lg transition-colors text-sm font-medium"
              >
                View Console
                <HardDrive className="w-4 h-4 text-surface-400" />
              </button>
              <button
                type="button"
                className="ui-quick-action w-full flex items-center justify-between p-3 rounded-lg transition-colors text-sm font-medium"
              >
                Manage Tokens
                <Plug className="w-4 h-4 text-surface-400" />
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
