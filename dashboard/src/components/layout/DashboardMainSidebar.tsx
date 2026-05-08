import { Link } from '@tanstack/react-router'
import {
  LayoutDashboard,
  Bot,
  Boxes,
  Package,
  Server,
  CreditCard,
  Users,
  Shield,
  Settings,
  LogOut,
  ChevronsLeft,
} from 'lucide-react'
import { type ComponentType } from 'react'
import { cn } from '@/lib/utils'

type NavItem = {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  exact?: boolean
}

type UserInfo = {
  name?: string | null
  username?: string | null
}

const mainNav: NavItem[] = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/dashboard/bots', label: 'My Bots', icon: Bot },
  { to: '/dashboard/plugins', label: 'Plugins', icon: Package },
  { to: '/dashboard/subscription', label: 'Subscription', icon: CreditCard },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings },
]

const adminNav: NavItem[] = [
  { to: '/dashboard/nodes', label: 'Nodes', icon: Server },
  { to: '/dashboard/releases', label: 'Core Releases', icon: Boxes },
  { to: '/dashboard/admin', label: 'Admin Panel', icon: Shield, exact: true },
  { to: '/dashboard/admin/plugin-requests', label: 'Plugin Requests', icon: Package },
  { to: '/dashboard/admin/users', label: 'Users', icon: Users },
]

function initials(name?: string | null) {
  if (!name) return 'U'
  const chunks = name.trim().split(/\s+/)
  return (chunks[0]?.[0] ?? 'U').toUpperCase() + (chunks[1]?.[0] ?? '').toUpperCase()
}

type Props = {
  collapsed: boolean
  onCollapse: () => void
  path: string
  isAdmin: boolean
  user?: UserInfo | null
  onLogout: () => void
}

export function DashboardMainSidebar({ collapsed, onCollapse, path, isAdmin, user, onLogout }: Props) {
  return (
    <aside className={cn('flex shrink-0 flex-col bg-sidebar transition-all', collapsed ? 'w-0 overflow-hidden' : 'w-60')}>
      <div className="flex h-12 items-center justify-between border-b border-border/50 px-4 shadow-sm">
        <span className="font-display text-sm font-semibold tracking-wide">Fragment</span>
        <button onClick={onCollapse} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
          <ChevronsLeft className="h-4 w-4" />
        </button>
      </div>
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-2 py-3">
        <NavGroup label="Workspace" items={mainNav} path={path} />
        {isAdmin && <NavGroup label="Administration" items={adminNav} path={path} />}
      </nav>
      <div className="flex items-center gap-2 border-t border-border/50 bg-sidebar-rail/60 p-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {initials(user?.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{user?.name ?? 'Unknown user'}</div>
          <div className="truncate text-[11px] text-muted-foreground">@{user?.username ?? 'guest'}</div>
        </div>
        <button onClick={onLogout} className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" title="Log out">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  )
}

function NavGroup({ label, items, path }: { label: string; items: NavItem[]; path: string }) {
  return (
    <div className="mb-4">
      <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = item.exact || item.to === '/dashboard' ? path === item.to : path.startsWith(item.to)
          const Icon = item.icon
          return (
            <li key={item.to}>
              <Link
                to={item.to as never}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground transition-colors',
                  active ? 'bg-sidebar-active text-foreground' : 'hover:bg-accent hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
