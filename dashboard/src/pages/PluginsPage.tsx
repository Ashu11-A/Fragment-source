import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchWithBadge } from '@/components/ui/SearchWithBadge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconTile } from '@/components/ui/IconTile'
import { formatPrice } from '@/lib/format-utils'
import { Puzzle, ArrowRight } from 'lucide-react'

export function PluginsPage() {
  const [search, setSearch] = useState('')
  const pluginsQuery = trpc.plugins.list.useQuery({})
  const plugins = pluginsQuery.data?.data ?? []
  const filtered = plugins.filter((plugin) => plugin.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        icon={Puzzle}
        title="Plugins"
        description="Browse and manage plugins for your bots."
      />

      <SearchWithBadge
        inputId="plugins-search"
        value={search}
        onChange={setSearch}
        placeholder="Search plugins..."
        count={filtered.length}
        itemLabel="plugin"
      />

      {pluginsQuery.isLoading ? (
        <LoadingSpinner text="Loading plugins..." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Puzzle} title="No plugins found" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((plugin, index) => (
            <Card
              key={plugin.id}
              className="group hover:border-blurple-500/40 hover:-translate-y-1 transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${100 + index * 50}ms` }}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <IconTile icon={Puzzle} interactive />
                    <div>
                      <CardTitle>{plugin.name}</CardTitle>
                      <CardDescription className="mt-0.5">v1.0.0</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-surface-400 line-clamp-3">Enhance your bot with advanced features.</p>
                <div className="flex items-center justify-between pt-2 border-t border-surface-800/50">
                  <Badge variant={plugin.price === 0 ? 'success' : 'default'}>{formatPrice(plugin.price)}</Badge>
                  <Button variant="secondary" size="sm" className="h-8 text-xs gap-1.5">
                    Details <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
