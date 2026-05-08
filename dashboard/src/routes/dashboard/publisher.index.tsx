import { createFileRoute, Link } from '@tanstack/react-router'
import { Plus, Sparkles, BarChart3 } from 'lucide-react'
import { Badge, Button, Card, CardHeader, PageHeader, Section } from '@/components/fragment/primitives'
import { usePlugin } from '@/hooks/usePlugin'

export const Route = createFileRoute('/dashboard/publisher/')({
  component: Publisher,
})

function Publisher() {
  const { grouped, requests, isLoading, isFetching } = usePlugin('publisherRequests')

  return (
    <>
      <PageHeader
        title="Publisher Hub"
        subtitle="Manage your plugin submissions."
        actions={(
          <>
            <Link to="/dashboard/publisher/stats"><Button variant="secondary"><BarChart3 className="h-4 w-4" /> Creator Stats</Button></Link>
            <Link to="/dashboard/plugins"><Button><Plus className="h-4 w-4" /> Submit Plugin</Button></Link>
          </>
        )}
      />
      <Section>
        <Card className="mb-6">
          <CardHeader title="Submission Summary" />
          <div className="grid gap-4 p-5 md:grid-cols-4">
            <Summary label="Total" value={String(requests.length)} />
            <Summary label="Pending" value={String(grouped.pending.length)} />
            <Summary label="Approved" value={String(grouped.approved.length)} />
            <Summary label="Rejected" value={String(grouped.rejected.length)} />
          </div>
        </Card>

        {isLoading ? (
          <Card className="p-5 text-sm text-muted-foreground">Loading your publish requests...</Card>
        ) : requests.length === 0 ? (
          <Card className="p-5 text-sm text-muted-foreground">No publish requests found. Create your first plugin and submit a release request from the API workflow.</Card>
        ) : (
          <div className="grid gap-3">
            {requests.map((request) => (
              <Card key={request.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold">{request.name}</span>
                    <span className="text-[11px] text-muted-foreground">v{request.version}</span>
                    <Badge tone={request.status === 'approved' ? 'success' : request.status === 'rejected' ? 'destructive' : 'warning'}>{request.status}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Created: <span className="text-foreground">{new Date(request.createdAt).toLocaleString()}</span>
                    {' · '}Min Core: <span className="text-foreground">{request.minReleaseVersion}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" disabled>Edit</Button>
                  <Button size="sm" variant="ghost" disabled={isFetching}>Refresh</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
    </div>
  )
}
