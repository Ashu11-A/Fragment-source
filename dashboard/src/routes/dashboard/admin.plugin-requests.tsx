import { createFileRoute, Link } from '@tanstack/react-router'
import { Check, Download, PackageCheck, RotateCcw, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, Card, CardHeader, Empty, PageHeader, Section } from '@/components/fragment/primitives'
import { usePlugin } from '@/hooks/usePlugin'
import { useTRPCClient } from '@/lib/trpc'

export const Route = createFileRoute('/dashboard/admin/plugin-requests')({
  component: AdminPluginRequests,
})

function AdminPluginRequests() {
  const trpcClient = useTRPCClient()
  const { requests, grouped, isLoading, error, decideRequest, deleteRequest, isDeciding, isDeleting } = usePlugin('publisherRequests')
  const [activeRequestId, setActiveRequestId] = useState<number | null>(null)

  const decide = async (requestId: number, approve: boolean) => {
    setActiveRequestId(requestId)
    await decideRequest({ requestId, approve })
    setActiveRequestId(null)
  }

  const remove = async (requestId: number) => {
    setActiveRequestId(requestId)
    await deleteRequest({ requestId })
    setActiveRequestId(null)
  }

  const download = async (requestId: number) => {
    setActiveRequestId(requestId)
    const result = await trpcClient.plugins.downloadPublishRequest.query({ requestId })
    const bytes = Uint8Array.from(atob(result.contentBase64), (char) => char.charCodeAt(0))
    const blob = new Blob([bytes], { type: result.mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = result.fileName
    link.click()
    URL.revokeObjectURL(url)
    setActiveRequestId(null)
  }

  return (
    <>
      <PageHeader title="Plugin Requests" subtitle="Review plugin submissions from all users." />
      <Section>
        {error && <Card className="mb-4 p-4 text-sm text-destructive">{error}</Card>}
        <div className="mb-4 grid gap-4 md:grid-cols-4">
          <Summary label="Total" value={requests.length} />
          <Summary label="Pending" value={grouped.pending.length} />
          <Summary label="Approved" value={grouped.approved.length} />
          <Summary label="Rejected" value={grouped.rejected.length} />
        </div>
        <Card>
          <CardHeader title="All Submissions" />
          {isLoading ? (
            <div className="p-5 text-sm text-muted-foreground">Loading plugin requests...</div>
          ) : requests.length === 0 ? (
            <div className="p-5">
              <Empty icon={<PackageCheck className="h-8 w-8" />} title="No plugin requests" description="Submissions from publishers will appear here." />
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {requests.map((request) => {
                const busy = activeRequestId === request.id && (isDeciding || isDeleting)
                return (
                  <li key={request.id} className="grid gap-3 px-5 py-4 xl:grid-cols-[1fr_auto]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-base font-bold">{request.name}</span>
                        <span className="text-xs text-muted-foreground">v{request.version}</span>
                        <Badge tone={request.status === 'approved' ? 'success' : request.status === 'rejected' ? 'destructive' : 'warning'}>{request.status}</Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">{request.description}</div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          Plugin:{' '}
                          <Link to="/dashboard/plugins/$pluginId" params={{ pluginId: String(request.plugin.id) }} className="text-foreground hover:underline">
                            {request.plugin.name}
                          </Link>
                        </span>
                        <span>Publisher: <span className="text-foreground">{request.creator.username}</span></span>
                        <span>Min core: <span className="text-foreground">{request.minReleaseVersion}</span></span>
                        <span>File: <span className="text-foreground">{request.file.name}</span></span>
                        <span>Submitted: <span className="text-foreground">{new Date(request.createdAt).toLocaleString()}</span></span>
                      </div>
                      {request.reviewNotes && <div className="mt-2 text-xs text-muted-foreground">Review notes: <span className="text-foreground">{request.reviewNotes}</span></div>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                      <Button size="sm" variant="secondary" disabled={activeRequestId === request.id} onClick={() => void download(request.id)}>
                        <Download className="h-4 w-4" /> Download
                      </Button>
                      <Button size="sm" variant="success" disabled={busy || request.status === 'approved'} onClick={() => void decide(request.id, true)}>
                        <Check className="h-4 w-4" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy || request.status !== 'approved'} onClick={() => void decide(request.id, false)}>
                        <RotateCcw className="h-4 w-4" /> Disapprove
                      </Button>
                      <Button size="sm" variant="destructive" disabled={busy || request.status === 'rejected'} onClick={() => void decide(request.id, false)}>
                        <X className="h-4 w-4" /> Reject
                      </Button>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => void remove(request.id)}>
                        <Trash2 className="h-4 w-4" /> Delete
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </Section>
    </>
  )
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
    </Card>
  )
}
