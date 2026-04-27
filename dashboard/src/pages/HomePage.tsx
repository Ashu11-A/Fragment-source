import { trpc } from '@/lib/trpc'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { EmptyState } from '@/components/EmptyState'
import { IconTile } from '@/components/IconTile'
import { formatPrice, formatDate } from '@/lib/format-utils'
import { getGradientColors } from '@/lib/gradient-utils'
import { useAuth } from '@/providers/AuthProvider'
import { useNavigate } from '@tanstack/react-router'
import {
  Bot,
  Puzzle,
  ArrowRight,
  Sparkles,
  TrendingUp,
  CreditCard,
} from 'lucide-react'

function PluginCard({ plugin }: { plugin: { id: number; name: string; price: number; createdAt: string } }) {
  const isFree = plugin.price === 0
  const navigate = useNavigate()

  return (
    <Card className="group hover:border-blurple-500/40 hover:shadow-blurple-500/10 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <IconTile icon={Puzzle} size="sm" />
            <div>
              <CardTitle className="text-base">{plugin.name}</CardTitle>
              <p className="text-xs text-surface-500 mt-0.5">v1.0.0</p>
            </div>
          </div>
          <Badge variant={isFree ? 'success' : 'default'}>
            {formatPrice(plugin.price)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-surface-400 mb-4 line-clamp-2">
          Enhance your bot with advanced features and customizable modules.
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-surface-600 uppercase tracking-wider">
            {formatDate(plugin.createdAt)}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1.5 text-blurple-400 hover:text-blurple-300"
            onClick={() => navigate({ to: '/plugins' })}
          >
            Details <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  color,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  trend?: string
  color: string
  onClick?: () => void
}) {
  const [wash1, wash2] = getGradientColors(color)
  return (
    <Card
      className={`relative overflow-hidden ${onClick ? 'cursor-pointer hover:border-blurple-500/30' : ''} transition-all duration-300`}
      onClick={onClick}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{ background: `linear-gradient(to bottom right, ${wash1}, ${wash2})` }}
      />
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-surface-500 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold text-[color:var(--text-primary)]">{value}</p>
            {trend && (
              <p className="flex items-center gap-1 text-xs text-emerald-400">
                <TrendingUp className="w-3 h-3" /> {trend}
              </p>
            )}
          </div>
          <div
            className="flex items-center justify-center w-12 h-12 rounded-2xl"
            style={{
              background: `linear-gradient(to bottom right, color-mix(in srgb, ${wash1} 10%, transparent), color-mix(in srgb, ${wash2} 10%, transparent))`,
            }}
          >
            <Icon className="w-6 h-6 text-surface-300" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const pluginsQuery = trpc.plugins.list.useQuery({})
  const botsQuery = trpc.bots.list.useQuery({ type: 'your' })
  const subscriptionsQuery = trpc.subscriptions.list.useQuery({})

  const plugins = pluginsQuery.data?.data ?? []
  const bots = botsQuery.data?.data ?? []
  const subscriptions = subscriptionsQuery.data?.data ?? []
  const activeBots = bots.filter((bot) => bot.enabled).length

  return (
    <div className="space-y-8 max-w-7xl">
      <div className="space-y-1 animate-slide-up">
        <h1 className="text-2xl font-bold">
          Welcome back, <span className="gradient-text">{user?.name ?? 'User'}</span>
        </h1>
        <p className="text-surface-400 text-sm">
          Here's an overview of your Fragment ecosystem.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-slide-up" style={{ animationDelay: '50ms' }}>
        <StatCard
          icon={Bot}
          label="Active Bots"
          value={activeBots}
          trend={bots.length > 0 ? `${bots.length} total` : undefined}
          color="from-blurple-500 to-indigo-500"
          onClick={() => navigate({ to: '/bots' })}
        />
        <StatCard
          icon={Puzzle}
          label="Plugins"
          value={plugins.length}
          color="from-purple-500 to-pink-500"
          onClick={() => navigate({ to: '/plugins' })}
        />
        <StatCard
          icon={CreditCard}
          label="Subscriptions"
          value={subscriptions.filter((subscription) => subscription.active).length}
          trend={subscriptions.length > 0 ? `${subscriptions.length} total` : undefined}
          color="from-emerald-500 to-teal-500"
        />
      </div>

      <div className="space-y-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blurple-400" />
            <h2 className="text-lg font-semibold">Plugin Marketplace</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-surface-400"
            onClick={() => navigate({ to: '/plugins' })}
          >
            View all
          </Button>
        </div>

        {pluginsQuery.isLoading ? (
          <LoadingSpinner text="Loading plugins..." />
        ) : plugins.length === 0 ? (
          <EmptyState
            icon={Puzzle}
            title="No plugins available yet"
            description="Plugins will appear here once they're published."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plugins.slice(0, 6).map((plugin) => (
              <PluginCard key={plugin.id} plugin={plugin} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
