import { createFileRoute } from '@tanstack/react-router'
import { Card, CardHeader, Section, Stat } from '@/components/fragment/primitives'
import { cn } from '@/lib/utils'
import { useBot } from '@/hooks/useBots'
import { useBotRouteContext } from '@/routes/hooks/-useBotRouteContext'

export const Route = createFileRoute('/dashboard/bots/$botId/')({
  component: BotOverview,
})

function BotOverview() {
  const { botId } = Route.useParams()
  const { bot, isLoading } = useBotRouteContext(botId)
  const activity = useBot('activity', bot?.id, Boolean(bot), { maxRows: 12 })

  if (isLoading) {
    return <Section>Loading bot overview...</Section>
  }

  if (!bot) {
    return <Section>Bot not found.</Section>
  }

  return (
    <>
      <Section>
        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Nodes" value={bot.nodes?.length ?? 0} />
          <Stat label="Plugins" value={bot.plugins?.length ?? 0} />
          <Stat label="Subscriptions" value={bot.subscriptions?.length ?? 0} />
          <Stat label="Created" value={new Date(bot.createdAt).toLocaleDateString()} />
        </div>
      </Section>
      <Section className="pt-0">
        <Card>
          <CardHeader title="Recent Activity" />
          <ul className="divide-y divide-border/60">
            {activity.rows.length === 0 ? (
              <li className="px-5 py-3 text-sm text-muted-foreground">No activity recorded yet.</li>
            ) : (
              activity.rows.map((row) => (
                <li key={row.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <span
                    className={cn(
                      'status-dot',
                      row.display === 'error'
                        ? 'bg-destructive text-destructive'
                        : row.display === 'success'
                          ? 'bg-success text-success'
                          : 'bg-primary text-primary',
                    )}
                  />
                  <span className="flex-1 text-foreground">{row.message}</span>
                  <span className="text-xs text-muted-foreground">{activity.formatRelativeTime(row.createdAt)}</span>
                </li>
              ))
            )}
          </ul>
        </Card>
      </Section>
    </>
  )
}
