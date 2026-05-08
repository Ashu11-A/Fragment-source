import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Bot, Camera, Monitor } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button, Card, CardHeader, Field, Input, PageHeader, Section, Textarea } from '@/components/fragment/primitives'
import { useAuth } from '@/hooks/useAuth'
import { useTRPC } from '@/lib/trpc'
import { ActionRow, OptionSelect, ToggleSwitch } from '@/routes/shared/-RouteControls'

export const Route = createFileRoute('/dashboard/settings')({
  component: Settings,
})

function Settings() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const trpc = useTRPC()
  const updateMutation = useMutation(trpc.users.update.mutationOptions())
  const sessionsQuery = useQuery(trpc.auth.sessions.queryOptions())
  const logoutAllMutation = useMutation(trpc.auth.logoutAll.mutationOptions())

  const [emailNotif, setEmailNotif] = useState(true)
  const [marketing, setMarketing] = useState(false)
  const themeOptions = ['Dark', 'Light', 'System'] as const
  const languageOptions = ['English', 'Portuguese', 'Spanish'] as const
  const [theme, setTheme] = useState<(typeof themeOptions)[number]>('Dark')
  const [language, setLanguage] = useState<(typeof languageOptions)[number]>('English')
  const [displayName, setDisplayName] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setDisplayName(user.name)
    if (user.language.toLowerCase().includes('pt')) setLanguage('Portuguese')
    else if (user.language.toLowerCase().includes('es')) setLanguage('Spanish')
    else setLanguage('English')
  }, [user])

  const handleLogoutAll = async () => {
    await logoutAllMutation.mutateAsync()
    logout()
  }

  const saveProfile = async () => {
    if (!user) return
    setMessage(null)

    const mappedLanguage = language === 'Portuguese' ? 'pt-BR' : language === 'Spanish' ? 'es-ES' : 'en-US'
    await updateMutation.mutateAsync({
      id: user.id,
      name: displayName.trim(),
      language: mappedLanguage,
    })
    setMessage('Profile saved. Refresh the page to sync all session values.')
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your account and preferences." />
      <Section>
        <div className="grid gap-6">
          <Card>
            <CardHeader title="Profile" />
            <div className="grid gap-5 p-5 md:grid-cols-[auto_1fr]">
              <div className="relative">
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground">
                  {(user?.name ?? 'U').slice(0, 2).toUpperCase()}
                </div>
                <button className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-card text-foreground shadow-md ring-1 ring-border hover:bg-accent" disabled>
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Display Name"><Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></Field>
                <Field label="Email"><Input value={user?.email ?? ''} disabled /></Field>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-border/60 px-5 py-3">
              <Button variant="ghost" onClick={() => setDisplayName(user?.name ?? '')}>Cancel</Button>
              <Button onClick={() => void saveProfile()} disabled={updateMutation.isPending}>Save Changes</Button>
            </div>
            {message ? <div className="px-5 pb-4 text-sm text-muted-foreground">{message}</div> : null}
          </Card>

          <Card>
            <CardHeader title="Account" />
            <div className="divide-y divide-border/60">
              <ActionRow title="Change Password" hint="Update your password regularly to keep your account safe." action={<Button variant="secondary" size="sm" disabled>Change</Button>} />
              <ActionRow title="Two-Factor Authentication" hint="Add an extra layer of security to your account." action={<Button variant="secondary" size="sm" disabled>Enable 2FA</Button>} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Preferences" />
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="Theme">
                <OptionSelect value={theme} onChange={setTheme} options={themeOptions} className="w-full" />
              </Field>
              <Field label="Language">
                <OptionSelect value={language} onChange={setLanguage} options={languageOptions} className="w-full" />
              </Field>
              <ActionRow inline title="Email Notifications" action={<ToggleSwitch checked={emailNotif} onChange={setEmailNotif} />} />
              <ActionRow inline title="Marketing Emails" action={<ToggleSwitch checked={marketing} onChange={setMarketing} />} />
            </div>
            <div className="flex justify-end gap-2 border-t border-border/60 px-5 py-3">
              <Button variant="ghost">Cancel</Button>
              <Button>Save Preferences</Button>
            </div>
          </Card>

          <Card className="border-destructive/40">
            <CardHeader title="Danger Zone" />
            <div className="divide-y divide-border/60">
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium">Log Out All Sessions</h4>
                    <p className="text-sm text-muted-foreground">Sign out of Fragment everywhere you're logged in.</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => void handleLogoutAll()} disabled={logoutAllMutation.isPending || !sessionsQuery.data?.sessions.length}>
                    Log Out All
                  </Button>
                </div>
                {sessionsQuery.data && sessionsQuery.data.sessions.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {sessionsQuery.data.sessions.map((session) => {
                      const isBotSession = session.botId != null
                      const displayName = isBotSession
                        ? session.deviceName?.replace(/^bot:\d+\s*—\s*/, '') ?? 'Bot'
                        : session.deviceName || 'Browser session'

                      return (
                        <div
                          key={session.id}
                          className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
                            isBotSession
                              ? 'border-primary/30 bg-primary/5 cursor-pointer hover:bg-primary/10'
                              : 'border-border/60'
                          }`}
                          onClick={isBotSession ? () => void navigate({ to: '/dashboard/bots/$botId', params: { botId: String(session.botId) } }) : undefined}
                          role={isBotSession ? 'link' : undefined}
                        >
                          {isBotSession
                            ? <Bot className="h-4 w-4 text-primary" />
                            : <Monitor className="h-4 w-4 text-muted-foreground" />
                          }
                          <div className="flex-1">
                            <p className="text-sm font-medium">{displayName}</p>
                            <p className="text-xs text-muted-foreground">
                              {isBotSession ? 'Bot session' : 'Browser session'} · Active since {new Date(session.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {isBotSession && (
                            <span className="text-xs text-primary/70">View bot →</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              <ActionRow title="Sign Out" hint="End your current session." action={<Button size="sm" variant="destructive" onClick={() => void logout()}>Log Out</Button>} />
            </div>
          </Card>
        </div>
      </Section>
    </>
  )
}
