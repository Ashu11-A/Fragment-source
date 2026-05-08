import { createFileRoute, Link } from '@tanstack/react-router'
import { Bot, Power, Settings, Activity, Plus } from 'lucide-react'
import { Button, Card, Empty, PageHeader, Section, StatusPill, Dialog, DialogContent, Field, Input, Badge } from '@/components/fragment/primitives'
import { useBot } from '@/hooks/useBots'
import { useSubscription } from '@/hooks/useSubscription'

export const Route = createFileRoute('/dashboard/bots/')({
  component: MyBots,
})

function MyBots() {
  const {
    bots,
    statuses,
    isLoading,
    isFetching,
    handleToggle,
    createOpen,
    setCreateOpen,
    botName,
    setBotName,
    selectedNodeId,
    setSelectedNodeId,
    nodes,
    isLoadingNodes,
    handleCreate,
    loading,
    error,
  } = useBot('manager')

  const { subscriptions } = useSubscription('list')

  const activeSubscription = subscriptions.find((s) => s.active) ?? null
  const currentPlan = activeSubscription?.plan ?? null
  const isCanceled = !!activeSubscription?.canceledAt
  const maxBots = currentPlan?.maxBots ?? 1
  const activeBotCount = bots.filter((b) => b.enabled).length
  const isAtBotLimit = maxBots >= 0 && activeBotCount >= maxBots

  return (
    <>
      <PageHeader
        title="My Bots"
        subtitle={`${activeBotCount}${maxBots >= 0 ? `/${maxBots}` : ''} active bots${isCanceled ? ' — Subscription canceled, bots disabled' : ''}`}
        actions={
          <>
            <Button onClick={() => setCreateOpen(true)} disabled={isAtBotLimit}>
              <Plus className="h-4 w-4" /> Create Bot
            </Button>
            <Button variant="outline" disabled>{isFetching ? 'Syncing...' : 'Linked to live data'}</Button>
          </>
        }
      />
      {isCanceled && (
        <Section className="pb-0">
          <Badge tone="warning" className="text-sm">
            Your subscription has been canceled. All bots have been disabled. You can reactivate up to {maxBots >= 0 ? maxBots : 'unlimited'} bot(s) based on your current plan.
          </Badge>
        </Section>
      )}
      <Section>
        {isLoading ? (
          <Empty icon={<Bot className="h-10 w-10" />} title="Loading bots" description="Fetching your bot list..." />
        ) : bots.length === 0 ? (
          <Empty
            icon={<Bot className="h-10 w-10" />}
            title="No bots yet"
            description="Create your first Discord bot to get started."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {bots.map((bot) => {
              const isOnline = Boolean(statuses[bot.id])
              return (
                <Card key={bot.id} className="overflow-hidden">
                  <div className="h-20 bg-gradient-to-br from-primary/70 to-primary" />
                  <div className="-mt-8 px-5 pb-5">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl border-4 border-card bg-sidebar-rail font-display text-lg font-bold">
                      {bot.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="font-display text-lg font-bold">{bot.name}</div>
                      <StatusPill status={isOnline ? 'online' : 'offline'} />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>Nodes: <span className="text-foreground">{bot.nodes?.length ?? 0}</span></div>
                      <div>Plugins: <span className="text-foreground">{bot.plugins?.length ?? 0}</span></div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">Created: {new Date(bot.createdAt).toLocaleDateString()}</div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link to="/dashboard/bots/$botId" params={{ botId: String(bot.id) }}>
                        <Button size="sm" variant="secondary"><Settings className="h-3.5 w-3.5" /> Configure</Button>
                      </Link>
                      <Link to="/dashboard/bots/$botId/logs" params={{ botId: String(bot.id) }}>
                        <Button size="sm" variant="ghost"><Activity className="h-3.5 w-3.5" /> Logs</Button>
                      </Link>
                      <Button
                        size="sm"
                        variant={isOnline ? 'destructive' : 'success'}
                        disabled={!bot.enabled && isAtBotLimit}
                        onClick={() => void handleToggle(bot.id, !isOnline)}
                      >
                        <Power className="h-3.5 w-3.5" /> {isOnline ? 'Stop' : 'Start'}
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </Section>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent title="Create New Bot">
          <div className="space-y-4">
            <Field label="Bot Name">
              <Input
                placeholder="My Awesome Bot"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
              />
            </Field>
            <Field label="Node">
              <select
                  value={selectedNodeId}
                  onChange={(e) => setSelectedNodeId(e.target.value)}
                  className="h-9 w-full rounded-md border border-transparent bg-input px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40"
                >
                  <option value="">{isLoadingNodes ? 'Loading nodes...' : 'Select a node'}</option>
                  {nodes.map((node: { id: number; name: string }) => (
                    <option key={node.id} value={String(node.id)}>{node.name}</option>
                  ))}
              </select>
            </Field>
            {error && <div className="text-sm text-destructive">{error}</div>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={loading}>Cancel</Button>
              <Button onClick={() => void handleCreate()} disabled={loading || !botName.trim()}>
                {loading ? 'Creating...' : 'Create Bot'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
