import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Plus, Server } from 'lucide-react'
import { Badge, Button, Card, Dialog, DialogContent, Empty, Field, Input, PageHeader, ProgressBar, Section, StatusPill, Textarea } from '@/components/fragment/primitives'
import { useNode } from '@/hooks/useNode'

export const Route = createFileRoute('/dashboard/nodes/')({
  component: Nodes,
})

function Nodes() {
  const { nodes, isLoading } = useNode('list')
  const { create } = useNode('mutations')

  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('Brazil')
  const [memory, setMemory] = useState(0)
  const [disk, setDisk] = useState(0)
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Node name is required')
      return
    }
    setError('')
    try {
      await create.mutateAsync({
        name: name.trim(),
        description: description || null,
        location,
        memory,
        disk,
      })
      setCreateOpen(false)
      resetForm()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create node')
    }
  }

  const resetForm = () => {
    setName('')
    setLocation('Brazil')
    setMemory(0)
    setDisk(0)
    setDescription('')
    setError('')
  }

  return (
    <>
      <PageHeader
        title="Nodes"
        subtitle="Manage deployment infrastructure."
        actions={<Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Add Node</Button>}
      />
      <Section>
        {isLoading ? (
          <Empty icon={<Server className="h-10 w-10" />} title="Loading nodes" description="Fetching deployment infrastructure..." />
        ) : nodes.length === 0 ? (
          <Empty icon={<Server className="h-10 w-10" />} title="No nodes configured" description="Add a deployment node to host your bots." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {nodes.map((node) => (
              <Card key={node.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <Link to="/dashboard/nodes/$nodeId" params={{ nodeId: String(node.id) }} className="font-display text-lg font-bold hover:underline">{node.name}</Link>
                    <div className="mt-1 flex items-center gap-2">
                      <StatusPill status={node.maintenance ? 'starting' : 'online'} />
                      <Badge tone="primary">{node.location}</Badge>
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div>Bots: <span className="text-foreground">{node.bots?.length ?? 0}</span></div>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  <ResourceRow label="Memory Overallocation" value={node.memoryOverAllocationPercentage} tone={node.memoryOverAllocationPercentage > 80 ? 'destructive' : node.memoryOverAllocationPercentage > 60 ? 'warning' : 'primary'} />
                  <ResourceRow label="Disk Overallocation" value={node.diskOverAllocationPercentage} tone={node.diskOverAllocationPercentage > 80 ? 'destructive' : node.diskOverAllocationPercentage > 60 ? 'warning' : 'success'} />
                  <ResourceRow label="Assigned Bot Slots" value={Math.min(100, (node.bots?.length ?? 0) * 10)} tone="primary" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent title="Create New Node">
          <div className="space-y-4">
            <Field label="Name">
              <Input placeholder="Node Name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Location">
                <Input value={location} onChange={(e) => setLocation(e.target.value)} />
              </Field>
              <Field label="Memory (MiB)">
                <Input type="number" value={memory} onChange={(e) => setMemory(Number.parseInt(e.target.value, 10) || 0)} />
              </Field>
            </div>
            <Field label="Disk (MiB)">
              <Input type="number" value={disk} onChange={(e) => setDisk(Number.parseInt(e.target.value, 10) || 0)} />
            </Field>
            <Field label="Description">
              <Textarea placeholder="Optional description..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </Field>
            {error && <div className="text-sm text-destructive">{error}</div>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={create.isPending}>Cancel</Button>
              <Button onClick={() => void handleCreate()} disabled={create.isPending || !name.trim()}>
                {create.isPending ? 'Creating...' : 'Create Node'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ResourceRow({ label, value, tone }: { label: string; value: number; tone: 'primary' | 'success' | 'warning' | 'destructive' }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{value}%</span>
      </div>
      <ProgressBar value={value} tone={tone} />
    </div>
  )
}
