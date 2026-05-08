import { Bell, ChevronsLeft, Search } from 'lucide-react'
import { useNavBar } from '@/hooks/useNavBar'

type Props = {
  collapsed: boolean
  onExpand: () => void
}

export function DashboardNavBar({ collapsed, onExpand }: Props) {
  const { navBar } = useNavBar()

  return (
    <header className="flex h-12 items-center gap-3 border-b border-border/60 bg-background/60 px-4 backdrop-blur">
      {collapsed && (
        <button onClick={onExpand} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
          <ChevronsLeft className="h-4 w-4 rotate-180" />
        </button>
      )}
      {navBar.title ? <div className="text-sm font-semibold tracking-wide">{navBar.title}</div> : null}
      {navBar.showSearch ? (
        <div className="flex flex-1 items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            placeholder={navBar.searchPlaceholder}
            className="h-8 w-full max-w-md bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      ) : (
        <div className="flex-1" />
      )}
      {navBar.rightContent}
      {navBar.showNotifications ? (
        <button className="relative rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
        </button>
      ) : null}
    </header>
  )
}
