import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { Badge, Button, Card, CardHeader, PageHeader, Section, Stat } from '@/components/fragment/primitives'
import { useAuth } from '@/hooks/useAuth'
import { useBot } from '@/hooks/useBots'
import { usePlugin } from '@/hooks/usePlugin'
import { useSubscription } from '@/hooks/useSubscription'

export const Route = createFileRoute('/dashboard/')({
  component: Overview,
})

function Overview() {
  const { user } = useAuth()
  const { bots, statuses } = useBot('list')
  const { plugins, isLoading: isLoadingPlugins } = usePlugin('marketplace')
  const { subscriptions } = useSubscription('list')

  const activeBots = bots.filter((bot) => Boolean(statuses[bot.id])).length
  const activeSubscriptions = subscriptions.filter((subscription) => subscription.active).length

  return (
    <>
      <PageHeader
        title={`Welcome back, ${user?.name ?? 'there'}`}
        subtitle="Here's an overview of your Fragment ecosystem."
      />
      <Section>
        <div className="grid gap-4 md:grid-cols-3">
          <Stat label="Active Bots" value={activeBots} hint={`${bots.length} total`} />
          <Stat label="Marketplace Plugins" value={plugins.length} hint={isLoadingPlugins ? 'Syncing...' : 'Published and available'} />
          <Stat label="Active Subscriptions" value={activeSubscriptions} hint={`${subscriptions.length} records`} />
        </div>
      </Section>

      <Section className="pt-0">
        <Card>
          <CardHeader
            title="Plugin Marketplace"
            action={(
              <Link to="/dashboard/marketplace" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          />
          <div className="grid gap-px bg-border/60 md:grid-cols-2 lg:grid-cols-3">
            {plugins.slice(0, 6).map((plugin) => (
              <div key={plugin.id} className="bg-card p-5 transition hover:bg-accent/40">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-display text-base font-bold">{plugin.name}</div>
                    <div className="text-[11px] text-muted-foreground">by {plugin.creator?.username ?? 'unknown'}</div>
                  </div>
                  <Badge tone={plugin.price === 0 ? 'success' : 'primary'}>
                    {plugin.price === 0 ? 'Free' : `$${plugin.price.toFixed(2)}`}
                  </Badge>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{plugin.description ?? 'No description provided.'}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">{new Date(plugin.createdAt).toLocaleDateString()}</span>
                  <Button variant="ghost" size="sm">Details</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Section>
    </>
  )
}
