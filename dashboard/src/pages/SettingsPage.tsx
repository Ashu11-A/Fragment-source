import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/PageHeader'
import { useTheme } from '@/providers/ThemeProvider'
import { useAuth } from '@/providers/AuthProvider'
import { Settings, Palette, Sun, Moon } from 'lucide-react'

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        icon={Settings}
        title="Settings"
        description="Manage your preferences."
      />

      <Card className="animate-slide-up" style={{ animationDelay: '50ms' }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="w-4 h-4 text-blurple-400" /> Appearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button variant={theme === 'dark' ? 'default' : 'outline'} className="flex-1 gap-2" onClick={() => setTheme('dark')}>
              <Moon className="w-4 h-4" /> Dark
            </Button>
            <Button variant={theme === 'light' ? 'default' : 'outline'} className="flex-1 gap-2" onClick={() => setTheme('light')}>
              <Sun className="w-4 h-4" /> Light
            </Button>
          </div>
        </CardContent>
      </Card>

      {user && (
        <Card className="animate-slide-up" style={{ animationDelay: '100ms' }}>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-surface-500">Name</span>
              <span className="text-surface-200">{user.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-surface-500">Email</span>
              <span className="text-surface-200">{user.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-surface-500">Role</span>
              <span className="text-surface-200 capitalize">{user.role}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
