import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Plus, Puzzle, Save, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button, Card, CardHeader, Field, Input, Section, Textarea } from '@/components/fragment/primitives'
import { useBot } from '@/hooks/useBots'
import { useTRPC } from '@/lib/trpc'
import { useBotRouteContext } from '@/routes/hooks/-useBotRouteContext'

export const Route = createFileRoute('/dashboard/bots/$botId/config')({
  component: BotConfig,
})

function PluginEnvSection({ botId, pluginId, pluginName }: { botId: number; pluginId: number; pluginName: string }) {
  const trpc = useTRPC()
  const varsQuery = useQuery(trpc.bots.plugins.variables.get.queryOptions({ botId, pluginId }))
  const setVarsMutation = useMutation(trpc.bots.plugins.variables.set.mutationOptions())
  const [localValues, setLocalValues] = useState<Record<string, string>>({})

  const definitions = varsQuery.data?.definitions ?? []
  const variables = varsQuery.data?.variables ?? []
  const defaults = varsQuery.data?.defaults ?? []
  const customVars = variables.filter((v) => !definitions.some((d) => d.name === v.name))
  const hasEditable = definitions.length > 0 || customVars.length > 0
  const isDirty = Object.keys(localValues).length > 0

  const getValue = (name: string) =>
    localValues[name]
    ?? variables.find((v) => v.name === name)?.value
    ?? defaults.find((d) => d.name === name)?.value
    ?? ''

  const save = async () => {
    const merged = {
      ...Object.fromEntries(defaults.map((d) => [d.name, d.value])),
      ...Object.fromEntries(variables.map((v) => [v.name, v.value])),
      ...localValues,
    }
    await setVarsMutation.mutateAsync({
      botId,
      pluginId,
      variables: Object.entries(merged).map(([name, value]) => ({ name, value })),
    })
    setLocalValues({})
    await varsQuery.refetch()
  }

  return (
    <>
      <div className="flex items-center gap-2 border-t border-border/60 bg-muted/30 px-5 py-2">
        <Puzzle className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{pluginName}</span>
      </div>

      {varsQuery.isLoading ? (
        <div className="px-5 py-3 text-xs text-muted-foreground">Loading...</div>
      ) : !hasEditable ? (
        <div className="px-5 py-3 text-xs text-muted-foreground">No environment variables for this plugin.</div>
      ) : (
        <>
          {definitions.map((def) => (
            <div key={def.name} className="grid grid-cols-[1fr_2fr_auto] items-start gap-3 border-t border-border/60 px-5 py-3">
              <div>
                <div className="flex items-center gap-1 font-mono text-sm text-primary">
                  {def.name}
                  {def.required && <span className="text-destructive">*</span>}
                </div>
                {def.description ? <p className="mt-0.5 text-xs text-muted-foreground">{def.description}</p> : null}
              </div>
              <Input
                type={def.type === 'secret' ? 'password' : 'text'}
                value={getValue(def.name)}
                onChange={(e) => setLocalValues((prev) => ({ ...prev, [def.name]: e.target.value }))}
                placeholder={def.default ?? ''}
                className="font-mono text-sm"
              />
              <span />
            </div>
          ))}
          {customVars.map((v) => (
            <div key={v.name} className="grid grid-cols-[1fr_2fr_auto] items-center gap-3 border-t border-border/60 px-5 py-3">
              <div className="flex items-center gap-1 font-mono text-sm text-primary">
                {v.name}
                <span className="text-xs font-sans text-muted-foreground">(custom)</span>
              </div>
              <Input
                value={localValues[v.name] ?? v.value}
                onChange={(e) => setLocalValues((prev) => ({ ...prev, [v.name]: e.target.value }))}
                className="font-mono text-sm"
              />
              <span />
            </div>
          ))}
          {isDirty && (
            <div className="flex justify-end gap-2 border-t border-border/60 bg-muted/20 px-5 py-2">
              <Button size="sm" variant="ghost" onClick={() => setLocalValues({})}>Cancel</Button>
              <Button size="sm" onClick={() => void save()} disabled={setVarsMutation.isPending}>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {setVarsMutation.isPending ? 'Saving...' : 'Save & Apply'}
              </Button>
            </div>
          )}
        </>
      )}
    </>
  )
}

function BotConfig() {
  const { botId } = Route.useParams()
  const trpc = useTRPC()
  const { bot, isLoading, refetch } = useBotRouteContext(botId)
  const management = useBot('management', Number.parseInt(botId, 10))

  const numericBotId = Number.parseInt(botId, 10)

  const updateMutation = useMutation(trpc.bots.update.mutationOptions())
  const envVarsQuery = useQuery(trpc.bots.envs.get.queryOptions({ botId: numericBotId }))
  const setEnvVarsMutation = useMutation(trpc.bots.envs.set.mutationOptions())
  const pluginsQuery = useQuery(trpc.bots.plugins.list.queryOptions({ botId: numericBotId }))

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [token, setToken] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [showAddVariable, setShowAddVariable] = useState(false)
  const [newVarName, setNewVarName] = useState('')
  const [newVarValue, setNewVarValue] = useState('')

  useEffect(() => {
    if (!bot) return
    setName(bot.name)
    setDescription(bot.description ?? '')
  }, [bot])

  if (isLoading) {
    return <Section>Loading bot configuration...</Section>
  }

  if (!bot) {
    return <Section>Bot not found.</Section>
  }

  const saveChanges = async () => {
    setMessage(null)
    await updateMutation.mutateAsync({
      id: bot.id,
      name: name.trim(),
      description: description.trim().length > 0 ? description.trim() : null,
    })
    if (token.trim().length >= 24) {
      await management.setDiscordToken(token.trim())
      setToken('')
    }
    await refetch()
    setMessage('Settings saved.')
  }

  const addVariable = async () => {
    if (!newVarName.trim()) return
    const currentVars = envVarsQuery.data?.envs ?? []
    const updated = [...currentVars.filter((v) => v.name !== newVarName.trim()), { name: newVarName.trim(), value: newVarValue }]
    await setEnvVarsMutation.mutateAsync({ botId: bot.id, envs: updated })
    setNewVarName('')
    setNewVarValue('')
    setShowAddVariable(false)
    await envVarsQuery.refetch()
  }

  const removeVariable = async (varName: string) => {
    const currentVars = envVarsQuery.data?.envs ?? []
    const updated = currentVars.filter((v) => v.name !== varName)
    await setEnvVarsMutation.mutateAsync({ botId: bot.id, envs: updated })
    await envVarsQuery.refetch()
  }

  const envs = envVarsQuery.data?.envs ?? []
  const plugins = pluginsQuery.data?.plugins ?? []

  return (
    <Section>
      <div className="grid gap-6">
        <Card>
          <CardHeader title="General Settings" />
          <div className="grid gap-4 p-5 md:grid-cols-2">
            <Field label="Bot Name"><Input value={name} onChange={(event) => setName(event.target.value)} /></Field>
            <Field label="Discord Token" hint="Store or rotate token securely from this panel.">
              <Input type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste new Discord token" />
            </Field>
            <Field label="Description">
              <Textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 border-t border-border/60 px-5 py-3">
            <Button onClick={() => void saveChanges()} disabled={updateMutation.isPending || management.isBusy}>Save Changes</Button>
          </div>
          {message ? <div className="px-5 pb-4 text-sm text-muted-foreground">{message}</div> : null}
        </Card>

        <Card>
          <CardHeader
            title="Core Variables"
            action={
              <Button size="sm" variant="secondary" onClick={() => setShowAddVariable(true)} disabled={setEnvVarsMutation.isPending}>
                <Plus className="h-3.5 w-3.5" /> Add Variable
              </Button>
            }
          />
          <ul className="divide-y divide-border/60">
            <li className="grid grid-cols-[1fr_2fr_auto] items-center gap-3 px-5 py-3 font-mono text-sm">
              <span className="text-primary">FRAGMENT_BOT_ID</span>
              <span className="truncate text-muted-foreground">{bot.id}</span>
              <span />
            </li>
            {envs.map((v) => (
              <li key={v.name} className="grid grid-cols-[1fr_2fr_auto] items-center gap-3 px-5 py-3 font-mono text-sm">
                <span className="text-primary">{v.name}</span>
                <span className="truncate text-muted-foreground">{v.value}</span>
                <button
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => void removeVariable(v.name)}
                  disabled={setEnvVarsMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
            {envs.length === 0 && (
              <li className="px-5 py-3 text-xs text-muted-foreground">No custom environment variables configured.</li>
            )}
          </ul>

          {showAddVariable && (
            <div className="border-t border-border/60 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Variable Name">
                  <Input value={newVarName} onChange={(e) => setNewVarName(e.target.value)} placeholder="e.g. API_KEY" />
                </Field>
                <Field label="Variable Value">
                  <Input value={newVarValue} onChange={(e) => setNewVarValue(e.target.value)} placeholder="Enter value..." />
                </Field>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowAddVariable(false)}>Cancel</Button>
                <Button onClick={() => void addVariable()} disabled={!newVarName.trim() || setEnvVarsMutation.isPending}>
                  Add Variable
                </Button>
              </div>
            </div>
          )}
        </Card>

        {plugins.length > 0 && (
          <Card>
            <CardHeader title="Plugin Variables" />
            {plugins.map((plugin) => (
              <PluginEnvSection key={plugin.id} botId={numericBotId} pluginId={plugin.id} pluginName={plugin.name} />
            ))}
          </Card>
        )}

        <Card className="border-destructive/40">
          <CardHeader title="Danger Zone" />
          <div className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="text-sm text-muted-foreground">Destructive actions cannot be undone.</div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => void saveChanges()} disabled={management.isBusy || updateMutation.isPending}>Update Token</Button>
              <Button variant="destructive" onClick={() => void management.deleteBot()} disabled={management.isBusy}>Delete Bot</Button>
            </div>
          </div>
        </Card>
      </div>
    </Section>
  )
}
