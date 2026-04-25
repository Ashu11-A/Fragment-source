import { useLocation, Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Search, Sun, Moon, ChevronRight, LogOut, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useTheme } from '@/providers/ThemeProvider'
import { useAuth } from '@/providers/AuthProvider'
import { Input } from '@/components/ui/input'

interface TopNavbarProps {
  className?: string
  onMenuToggle?: () => void
}

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return [{ label: 'Home', path: '/' }]

  return [
    { label: 'Home', path: '/' },
    ...segments.map((seg, i) => ({
      label: seg.charAt(0).toUpperCase() + seg.slice(1),
      path: '/' + segments.slice(0, i + 1).join('/'),
    })),
  ]
}

export function TopNavbar({ className, onMenuToggle }: TopNavbarProps) {
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const location = useLocation()
  const breadcrumbs = getBreadcrumbs(location.pathname)

  return (
    <header
      className={cn(
        'ui-topbar border-b flex items-center justify-between h-14 px-4 md:px-6 shrink-0',
        'backdrop-blur-md',
        className,
      )}
    >
      {/* Left: Hamburger + Breadcrumbs */}
      <div className="flex items-center gap-2">
        {/* Mobile hamburger */}
        {onMenuToggle && (
          <Button
            id="mobile-menu-toggle"
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:hidden"
            onClick={onMenuToggle}
          >
            <Menu className="w-5 h-5 text-surface-400" />
          </Button>
        )}

        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.path} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-surface-600" />}
              {index === breadcrumbs.length - 1 ? (
                <span className="font-medium text-surface-200">{crumb.label}</span>
              ) : (
                <Link
                  to={crumb.path}
                  className="text-surface-500 hover:text-surface-300 transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Search */}
        <div className="relative hidden md:flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-surface-500 pointer-events-none" />
          <Input
            id="global-search"
            placeholder="Search..."
            className="w-56 pl-9 h-8 text-xs border ui-input-compact"
          />
        </div>

        {/* Theme toggle */}
        <Button
          id="theme-toggle"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={toggleTheme}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-surface-400" />
          ) : (
            <Moon className="w-4 h-4 text-surface-400" />
          )}
        </Button>

        {/* User profile */}
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-surface-700/50">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-[10px]">
                {user.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium text-surface-300 hidden lg:block">
              {user.username}
            </span>
            <Button
              id="logout-button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => logout()}
            >
              <LogOut className="w-3.5 h-3.5 text-surface-500" />
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
