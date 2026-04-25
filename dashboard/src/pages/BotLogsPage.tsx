import { getRouteApi } from '@tanstack/react-router'
import { useBot } from '@/hooks/useBots'
import { useBotActivity } from '@/hooks/useBotActivity'
import { useBotDetailStore } from '@/stores/botDetailStore'
import { BotActivityFeed } from '@/components/bot/BotActivityFeed'
import { BotCoreConsoleStream } from '@/components/bot/BotCoreConsoleStream'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { BotNotFound } from '@/components/ui/BotNotFound'

const botShellRouteApi = getRouteApi('/_authenticated/bots_/$botId')

export function BotLogsPage() {
  const { botId } = botShellRouteApi.useParams()
  const { bot, isLoading, isError, refetch } = useBot(botId)
  const { recentActivityFilter, setRecentActivityFilter } = useBotDetailStore()

  const numericBotId = bot?.id
  const {
    rows: activityRowsRaw,
    formatRelativeTime,
    isLoading: activityLoading,
    refetch: refetchActivity,
  } = useBotActivity(numericBotId, Boolean(bot), { historyLimit: 200 })

  const activityRows =
    recentActivityFilter === 'all'
      ? activityRowsRaw
      : activityRowsRaw.filter((a) => a.display === recentActivityFilter)

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!bot || isError) {
    return <BotNotFound onRetry={() => refetch()} />
  }

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">Logs &amp; activity</h1>
        <p className="text-sm text-surface-500 mt-1">
          Live stream from the core and persisted history on the server ({bot.name}).
        </p>
      </div>

      <BotCoreConsoleStream botId={numericBotId} enabled={Boolean(bot)} />

      <BotActivityFeed
        title="Activity"
        filteredRows={activityRows}
        formatRelativeTime={formatRelativeTime}
        isLoading={activityLoading}
        onRefetch={refetchActivity}
        filter={recentActivityFilter}
        onFilterChange={setRecentActivityFilter}
        maxHeightClass="max-h-[min(50vh,480px)]"
      />
    </div>
  )
}
