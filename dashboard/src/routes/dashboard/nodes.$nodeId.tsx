import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { Button, Card, CardHeader, Field, Input, PageHeader, Section, StatusPill } from '@/components/fragment/primitives'
import { nodeUtils, useNode } from '@/hooks/useNode'
import { useNodeRouteContext } from '@/routes/hooks/-useNodeRouteContext'

export const Route = createFileRoute('/dashboard/nodes/$nodeId')({
  component: NodeDetail,
})

function NodeDetail() {
  const { nodeId } = Route.useParams()
  const { node, isOnline, nodeStatus, isLoading, refetch } = useNodeRouteContext(nodeId)
  const mutations = useNode('mutations')
  const { botsQuery } = useNode('settings')

  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [memory, setMemory] = useState(0)
  const [disk, setDisk] = useState(0)
  const [selectedBotId, setSelectedBotId] = useState('')

  useEffect(() => {
    if (!node) return
    setName(node.name)
    setLocation(node.location)
    setMemory(node.memory)
    setDisk(node.disk)
  }, [node])

  const assignedBotIds = useMemo(() => new Set((node?.bots ?? []).map((bot) => bot.id)), [node?.bots])
  const availableBots = (botsQuery.data?.items ?? []).filter((bot) => !assignedBotIds.has(bot.id))

  if (isLoading) {
    return <Section>Loading node...</Section>
  }

  if (!node) {
    return <Section>Node not found.</Section>
  }

  const saveConfiguration = async () => {
    await mutations.update.mutateAsync({
      id: node.id,
      name: name.trim(),
      location: location.trim(),
      memory,
      disk,
    })
    await refetch()
  }

  const assignBot = async () => {
    const parsed = Number.parseInt(selectedBotId, 10)
    if (!Number.isInteger(parsed) || parsed <= 0) return
    await mutations.assignBot.mutateAsync({ nodeId: node.id, botId: parsed })
    setSelectedBotId('')
    await Promise.all([refetch(), botsQuery.refetch()])
  }

  const unassignBot = async (botEntryId: number) => {
    await mutations.unassignBot.mutateAsync({ nodeId: node.id, botId: botEntryId })
    await Promise.all([refetch(), botsQuery.refetch()])
  }

  return (
    <>
      <PageHeader title={node.name} subtitle="Configure deployment infrastructure." actions={<StatusPill status={node.maintenance ? 'starting' : isOnline ? 'online' : 'offline'} />} />
      <Section>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Overview" />
            <dl className="grid grid-cols-2 gap-4 p-5 text-sm">
              <Item k="Location" v={node.location} />
              <Item k="Daemon" v={isOnline ? 'Online' : 'Offline'} />
              <Item k="Memory Limit" v={`${node.memory} MiB`} />
              <Item k="Disk Limit" v={`${node.disk} MiB`} />
              <Item k="Connections" v={String(nodeStatus.activeConnections)} />
              <Item k="Last Update" v={nodeStatus.updatedAt ? new Date(nodeStatus.updatedAt).toLocaleString() : 'Waiting for socket'} />
              <Item k="Dashboard Socket" v={nodeStatus.connectedToServer ? 'Connected' : 'Disconnected'} />
            </dl>
          </Card>
          <Card>
            <CardHeader title="Configuration" />
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <Field label="Name"><Input value={name} onChange={(event) => setName(event.target.value)} /></Field>
              <Field label="Location"><Input value={location} onChange={(event) => setLocation(event.target.value)} /></Field>
              <Field label="Memory (MiB)"><Input type="number" value={memory} onChange={(event) => setMemory(Number.parseInt(event.target.value, 10) || 0)} /></Field>
              <Field label="Disk (MiB)"><Input type="number" value={disk} onChange={(event) => setDisk(Number.parseInt(event.target.value, 10) || 0)} /></Field>
            </div>
            <div className="flex justify-end gap-2 border-t border-border/60 px-5 py-3">
              <Button variant="ghost" onClick={() => void refetch()}>Cancel</Button>
              <Button onClick={() => void saveConfiguration()} disabled={mutations.update.isPending}>Save Changes</Button>
            </div>
          </Card>
        </div>
        <Card className="mt-6">
          <CardHeader title="Daemon Initialization" />
          <div className="grid gap-4 p-5">
            <Field label="Authentication Token" hint="Use this token when configuring this daemon.">
              <Input value={node.token} readOnly className="font-mono" />
            </Field>
            <Field label="Command">
              <Input value={nodeUtils.generateNodeCommand(node)} readOnly className="font-mono" />
            </Field>
          </div>
        </Card>
        <Card className="mt-6">
          <CardHeader title="Assigned Bots" />
          <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3">
            <select value={selectedBotId} onChange={(event) => setSelectedBotId(event.target.value)} className="h-9 min-w-56 rounded-md border border-transparent bg-input px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40">
              <option value="">Select a bot...</option>
              {availableBots.map((botEntry) => <option key={botEntry.id} value={String(botEntry.id)}>{botEntry.name}</option>)}
            </select>
            <Button size="sm" onClick={() => void assignBot()} disabled={mutations.assignBot.isPending || selectedBotId.length === 0}>Assign Bot</Button>
          </div>
          <ul className="divide-y divide-border/60">
            {(node.bots ?? []).length === 0 ? (
              <li className="px-5 py-3 text-sm text-muted-foreground">No bots assigned to this node.</li>
            ) : (
              (node.bots ?? []).map((botEntry) => (
                <li key={botEntry.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-xs font-bold text-primary">{botEntry.name.slice(0, 2).toUpperCase()}</span>
                    <span className="font-medium">{botEntry.name}</span>
                  </div>
                  <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => void unassignBot(botEntry.id)} disabled={mutations.unassignBot.isPending}>Unassign</Button>
                </li>
              ))
            )}
          </ul>
        </Card>
      </Section>
    </>
  )
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{k}</dt>
      <dd className="mt-1 font-mono">{v}</dd>
    </div>
  )
}
