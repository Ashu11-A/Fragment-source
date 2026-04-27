import { trpc } from '@/lib/trpc'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { PageHeader } from '@/components/PageHeader'
import { getGradientColors } from '@/lib/gradient-utils'
import { Users, Bot, Puzzle, CreditCard, TrendingUp, Activity } from 'lucide-react'

function AdminStatCard({
  icon: Icon,
  label,
  value,
  gradient,
  delay,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  gradient: string
  delay: string
}) {
  const [color1, color2] = getGradientColors(gradient)
  return (
    <Card className="relative overflow-hidden group hover:border-blurple-500/30 transition-all duration-300 animate-slide-up" style={{ animationDelay: delay }}>
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-300"
        style={{ background: `linear-gradient(135deg, ${color1}, ${color2})` }}
      />
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div
            className="flex items-center justify-center w-14 h-14 rounded-2xl shadow-lg"
            style={{ background: `linear-gradient(135deg, ${color1}, ${color2})` }}
          >
            <Icon className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-3xl font-bold text-[color:var(--text-primary)]">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function AdminPage() {
  const statsQuery = trpc.stats.summary.useQuery()

  if (statsQuery.isLoading) {
    return <LoadingSpinner text="Loading stats..." paddingY="py-16" />
  }

  const stats = statsQuery.data?.data

  return (
    <div className="space-y-8 max-w-7xl">
      <PageHeader
        icon={Activity}
        title="Admin Control Panel"
        description="System overview and management tools."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          icon={Users}
          label="Total Users"
          value={stats?.totalUsers ?? 0}
          gradient="from-blue-500 to-cyan-500"
          delay="50ms"
        />
        <AdminStatCard
          icon={Bot}
          label="Total Bots"
          value={stats?.totalBots ?? 0}
          gradient="from-blurple-500 to-indigo-500"
          delay="100ms"
        />
        <AdminStatCard
          icon={Puzzle}
          label="Active Plugins"
          value={stats?.totalPlugins ?? 0}
          gradient="from-purple-500 to-pink-500"
          delay="150ms"
        />
        <AdminStatCard
          icon={CreditCard}
          label="Subscriptions"
          value={stats?.activeSubscriptions ?? 0}
          gradient="from-emerald-500 to-teal-500"
          delay="200ms"
        />
      </div>

      <Card className="animate-slide-up" style={{ animationDelay: '250ms' }}>
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5 text-blurple-400" />
            <h2 className="text-lg font-semibold">System Health</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-surface-500">Server</p>
              <div className="flex items-center gap-1.5">
                <div className="ui-activity-success w-2 h-2 rounded-full animate-pulse-soft" />
                <span className="text-sm font-medium text-surface-200">Online</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-surface-500">Database</p>
              <div className="flex items-center gap-1.5">
                <div className="ui-activity-success w-2 h-2 rounded-full animate-pulse-soft" />
                <span className="text-sm font-medium text-surface-200">Connected</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-surface-500">API Version</p>
              <span className="text-sm font-medium text-surface-200">v1.0.0</span>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-surface-500">tRPC</p>
              <span className="text-sm font-medium text-surface-200">v11</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
