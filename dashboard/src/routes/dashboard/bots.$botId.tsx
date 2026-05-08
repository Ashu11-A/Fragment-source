import { createFileRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'
import { Settings, Activity, Database, Puzzle, Layers } from 'lucide-react'
import { Button, StatusPill } from '@/components/fragment/primitives'
import { cn } from '@/lib/utils'
import { useBot } from '@/hooks/useBots'
import { useBotRouteContext } from '@/routes/hooks/-useBotRouteContext'

export const Route = createFileRoute('/dashboard/bots/$botId')({
  component: BotShell,
})

const tabs = [
  { to: '/dashboard/bots/$botId', label: 'Overview', icon: Layers, exact: true },
  { to: '/dashboard/bots/$botId/config', label: 'Configuration', icon: Settings, exact: false },
  { to: '/dashboard/bots/$botId/database', label: 'Database', icon: Database, exact: false },
  { to: '/dashboard/bots/$botId/logs', label: 'Logs', icon: Activity, exact: false },
  { to: '/dashboard/bots/$botId/plugins', label: 'Plugins', icon: Puzzle, exact: false },
] as const

function BotShell() {
  const { botId } = Route.useParams()
  const path = useRouterState({ select: (s) => s.location.pathname })
  const { bot, isOnline, isLoading } = useBotRouteContext(botId)
  const management = useBot('management', Number.parseInt(botId, 10))

  if (isLoading) {
    return <div className="px-6 py-8 text-sm text-muted-foreground">Loading bot details...</div>
  }

  if (!bot) {
    return <div className="px-6 py-8 text-sm text-muted-foreground">Bot not found.</div>
  }

  return (
    <>
      <div className="border-b border-border/60 px-6 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/70 to-primary font-display font-bold text-white">
              {bot.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold">{bot.name}</h1>
                <StatusPill status={isOnline ? 'online' : 'offline'} />
              </div>
              <div className="text-xs text-muted-foreground">Bot ID · {bot.id}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant={isOnline ? 'destructive' : 'success'} disabled={management.isBusy} onClick={() => void (isOnline ? management.stopBot() : management.startBot())}>
              {isOnline ? 'Stop' : 'Start'}
            </Button>
            <Button variant="secondary" disabled={management.isBusy} onClick={() => void management.restartBot()}>Restart</Button>
          </div>
        </div>
        <div className="mt-5 flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const active = tab.exact ? path === `/dashboard/bots/${botId}` : path.startsWith(tab.to.replace('$botId', botId))
            const Icon = tab.icon
            return (
              <Link
                key={tab.to}
                to={tab.to}
                params={{ botId }}
                className={cn(
                  'inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>
      <Outlet />
    </>
  )
}
