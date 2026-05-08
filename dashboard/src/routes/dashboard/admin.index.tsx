import { createFileRoute } from '@tanstack/react-router'
import { Check } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Card, CardHeader, PageHeader, Section, Stat } from '@/components/fragment/primitives'
import { useAdmin } from '@/hooks/useAdmin'
import { usePlugin } from '@/hooks/usePlugin'

export const Route = createFileRoute('/dashboard/admin/')({
  component: AdminPanel,
})

const health = [
  { name: 'Database', ok: true },
  { name: 'Redis', ok: true },
  { name: 'Queue', ok: true },
  { name: 'API', ok: true },
]

function AdminPanel() {
  const { summaryQuery } = useAdmin()
  const { grouped, isAdmin, decideRequest, isDeciding } = usePlugin('publisherRequests')
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null)

  const summary = summaryQuery.data

  const decide = async (requestId: number, approve: boolean) => {
    setSelectedRequestId(requestId)
    await decideRequest({ requestId, approve })
    setSelectedRequestId(null)
  }

  return (
    <>
      <PageHeader title="Admin Panel" subtitle="Platform administration and moderation." />
      <Section>
        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Total Users" value={summary?.users ?? '-'} />
          <Stat label="Total Bots" value={summary?.bots ?? '-'} />
          <Stat label="Total Plugins" value={summary?.plugins ?? '-'} />
          <Stat label="Active Subs" value={summary?.activeSubscriptions ?? '-'} />
        </div>
      </Section>
      <Section className="pt-0">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Plugin Submissions" />
            <ul className="divide-y divide-border/60">
              {grouped.pending.length === 0 ? (
                <li className="px-5 py-3 text-sm text-muted-foreground">No pending plugin submissions.</li>
              ) : (
                grouped.pending.map((submission) => (
                  <li key={submission.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div>
                      <div className="font-medium">{submission.name}</div>
                      <div className="text-xs text-muted-foreground">by {submission.creator.username} · {new Date(submission.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" disabled>Review</Button>
                      <Button size="sm" variant="success" disabled={!isAdmin || (isDeciding && selectedRequestId === submission.id)} onClick={() => void decide(submission.id, true)}>Approve</Button>
                      <Button size="sm" variant="destructive" disabled={!isAdmin || (isDeciding && selectedRequestId === submission.id)} onClick={() => void decide(submission.id, false)}>Reject</Button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </Card>
          <Card>
            <CardHeader title="System Health" />
            <ul className="divide-y divide-border/60">
              {health.map((item) => (
                <li key={item.name} className="flex items-center justify-between px-5 py-3">
                  <span className="font-medium">{item.name}</span>
                  <Badge tone="success"><Check className="h-3 w-3" /> Healthy</Badge>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </Section>
    </>
  )
}
