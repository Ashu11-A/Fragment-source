import { Link } from '@tanstack/react-router'
import { Store, Plus, Hexagon } from 'lucide-react'
import { cn } from '@/lib/utils'

type BotListItem = {
  id: string | number
  name: string
}

type Props = {
  path: string
  bots: BotListItem[]
  statuses: Record<string | number, unknown>
}

export function DashboardRailSidebar({ path, bots, statuses }: Props) {
  return (
    <aside className="flex w-[72px] shrink-0 flex-col items-center gap-2 bg-sidebar-rail py-3">
      <Link to="/dashboard" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground transition-all hover:rounded-xl">
        <Hexagon className="h-6 w-6" />
      </Link>
      <div className="my-1 h-px w-8 bg-border/60" />
      <Link
        to="/dashboard/marketplace"
        className={cn(
          'group relative flex h-12 w-12 items-center justify-center rounded-2xl bg-card text-sidebar-rail-foreground transition-all hover:rounded-xl hover:bg-primary hover:text-primary-foreground',
          path.startsWith('/dashboard/marketplace') && 'rounded-xl bg-primary text-primary-foreground',
        )}
        title="Marketplace"
      >
        <span
          className={cn(
            'absolute -left-0 top-1/2 h-0 w-1 -translate-y-1/2 rounded-r bg-foreground transition-all',
            path.startsWith('/dashboard/marketplace') ? 'h-8' : 'group-hover:h-5',
          )}
        />
        <Store className="h-5 w-5" />
      </Link>
      {bots.map((bot) => {
        const active = path.startsWith(`/dashboard/bots/${bot.id}`)
        const online = Boolean(statuses[bot.id])
        return (
          <Link
            key={bot.id}
            to="/dashboard/bots/$botId"
            params={{ botId: String(bot.id) }}
            className={cn(
              'group relative flex h-12 w-12 items-center justify-center rounded-2xl bg-card text-sm font-semibold text-sidebar-rail-foreground transition-all hover:rounded-xl hover:bg-primary hover:text-primary-foreground',
              active && 'rounded-xl bg-primary text-primary-foreground',
            )}
            title={bot.name}
          >
            <span className={cn('absolute -left-0 top-1/2 h-0 w-1 -translate-y-1/2 rounded-r bg-foreground transition-all', active ? 'h-8' : 'group-hover:h-5')} />
            {bot.name.slice(0, 2).toUpperCase()}
            <span className={cn('status-dot absolute bottom-0 right-0 ring-2 ring-sidebar-rail', online ? 'bg-success text-success' : 'bg-muted-foreground text-muted-foreground')} />
          </Link>
        )
      })}
      <Link to="/dashboard/bots" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card text-success transition-all hover:rounded-xl hover:bg-success hover:text-success-foreground" title="Manage bots">
        <Plus className="h-5 w-5" />
      </Link>
    </aside>
  )
}
