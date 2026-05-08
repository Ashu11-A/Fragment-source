import { createFileRoute, Link } from '@tanstack/react-router'
import { Search, Download, Puzzle, Sparkles, Bot } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Card, Dialog, DialogContent, Empty, Input, PageHeader, Section } from '@/components/fragment/primitives'
import { useBot } from '@/hooks/useBots'
import {
  marketplacePrices,
  marketplaceSorts,
  useMarketplaceFilters,
} from '@/routes/hooks/-useMarketplaceFilters'
import { OptionSelect } from '@/routes/shared/-RouteControls'

export const Route = createFileRoute('/dashboard/marketplace/')({
  component: Marketplace,
})

function Marketplace() {
  const {
    query,
    category,
    price,
    sort,
    categories,
    filteredPlugins,
    isCreatingCheckout,
    isInstallingPlugin,
    checkoutLoadingPluginId,
    installLoadingPluginId,
    setQuery,
    setCategory,
    setPrice,
    setSort,
    openCheckout,
    installPlugin,
  } = useMarketplaceFilters()

  const { bots, isLoading: isLoadingBots } = useBot('list')
  const [installDialogOpen, setInstallDialogOpen] = useState(false)
  const [selectedPluginId, setSelectedPluginId] = useState<number | null>(null)

  const handleInstallClick = (pluginId: number, pluginPrice: number) => {
    if (pluginPrice === 0) {
      setSelectedPluginId(pluginId)
      setInstallDialogOpen(true)
    } else {
      void openCheckout(pluginId)
    }
  }

  const handleBotSelect = async (botId: number) => {
    if (selectedPluginId == null) return
    try {
      await installPlugin(selectedPluginId, botId)
      setInstallDialogOpen(false)
      setSelectedPluginId(null)
    } catch {
      // Error is handled by the mutation; dialog stays open so user can retry
    }
  }

  const selectedPlugin = filteredPlugins.find((p) => p.id === selectedPluginId)

  return (
    <>
      <PageHeader title="Plugin Marketplace" subtitle="Discover plugins to enhance your bots." />
      <Section>
        <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search plugins..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <OptionSelect value={category} onChange={setCategory} options={categories} />
          <OptionSelect value={price} onChange={setPrice} options={marketplacePrices} />
          <OptionSelect value={sort} onChange={setSort} options={marketplaceSorts} />
          <Link to="/dashboard/publisher" className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Sparkles className="h-4 w-4" /> Publisher Hub
          </Link>
        </div>

        {filteredPlugins.length === 0 ? (
          <Empty icon={<Puzzle className="h-10 w-10" />} title="No plugins found" description="Try adjusting your search or filters." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredPlugins.map((plugin) => (
              <Card key={plugin.id} className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-display text-lg font-bold">{plugin.name}</div>
                    <div className="text-xs text-muted-foreground">by {plugin.creator?.username ?? 'unknown'}</div>
                  </div>
                  <Badge tone={plugin.price === 0 ? 'success' : 'primary'}>{plugin.price === 0 ? 'Free' : `$${plugin.price.toFixed(2)}`}</Badge>
                </div>
                <p className="mt-3 line-clamp-3 flex-1 text-sm text-muted-foreground">{plugin.description ?? 'No description available.'}</p>
                <div className="mt-4 flex items-center justify-between">
                  <Badge tone="muted">{new Date(plugin.createdAt).toLocaleDateString()}</Badge>
                  <div className="flex gap-2">
                    <Link to="/dashboard/plugins/$pluginId" params={{ pluginId: String(plugin.id) }}>
                      <Button size="sm" variant="ghost">Details</Button>
                    </Link>
                    <Button
                      size="sm"
                      onClick={() => void handleInstallClick(plugin.id, plugin.price)}
                      disabled={
                        (isCreatingCheckout && checkoutLoadingPluginId === plugin.id) ||
                        (isInstallingPlugin && installLoadingPluginId === plugin.id)
                      }
                    >
                      <Download className="h-3.5 w-3.5" /> {plugin.price === 0 ? 'Install' : 'Checkout'}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>

      <Dialog open={installDialogOpen} onOpenChange={setInstallDialogOpen}>
        <DialogContent title={selectedPlugin ? `Install ${selectedPlugin.name}` : 'Install Plugin'}>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select a bot to install this plugin on. The plugin will be deployed and the bot will be restarted.
            </p>
            {isLoadingBots ? (
              <div className="text-sm text-muted-foreground">Loading bots...</div>
            ) : bots.length === 0 ? (
              <Empty
                icon={<Bot className="h-8 w-8" />}
                title="No bots found"
                description="Create a bot first to install plugins."
                action={
                  <Link to="/dashboard/bots">
                    <Button size="sm">Create Bot</Button>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-2">
                {bots.map((bot) => (
                  <Button
                    key={bot.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => void handleBotSelect(bot.id)}
                    disabled={isInstallingPlugin}
                  >
                    <Bot className="h-4 w-4 mr-2" />
                    <span className="flex-1 text-left">{bot.name}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
