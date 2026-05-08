import { createFileRoute, Link } from '@tanstack/react-router'
import { Plus, Puzzle } from 'lucide-react'
import { Badge, Button, Card, Empty, Section } from '@/components/fragment/primitives'
import { useBot } from '@/hooks/useBots'

export const Route = createFileRoute('/dashboard/bots/$botId/plugins')({
  component: BotPlugins,
})

function BotPlugins() {
  const { botId } = Route.useParams()
  const {
    filteredPlugins,
    isLoadingPlugins,
    togglePluginAssignment,
    mutatingPluginId,
    isMutating,
  } = useBot('plugins', botId)

  return (
    <Section>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manage plugins for this bot.</p>
        <Link to="/dashboard/marketplace"><Button><Plus className="h-4 w-4" /> Install Plugin</Button></Link>
      </div>
      {isLoadingPlugins ? (
        <Empty icon={<Puzzle className="h-10 w-10" />} title="Loading plugins" description="Fetching assigned plugins..." />
      ) : filteredPlugins.length === 0 ? (
        <Empty
          icon={<Puzzle className="h-10 w-10" />}
          title="No plugins installed"
          description="Browse the marketplace to find plugins for your bot."
          action={<Link to="/dashboard/marketplace"><Button>Browse Marketplace</Button></Link>}
        />
      ) : (
        <div className="grid gap-3">
          {filteredPlugins.map((plugin) => (
            <Card key={plugin.id} className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Puzzle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold">{plugin.name}</span>
                  <Badge tone={plugin.published ? 'success' : 'warning'}>{plugin.published ? 'Published' : 'Draft'}</Badge>
                  <span className="text-[11px] text-muted-foreground">${plugin.price.toFixed(2)}</span>
                </div>
                <div className="mt-1 truncate text-sm text-muted-foreground">{plugin.description ?? 'No description provided.'}</div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10"
                  disabled={isMutating && mutatingPluginId === plugin.id}
                  onClick={() => void togglePluginAssignment(plugin)}
                >
                  Uninstall
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Section>
  )
}
