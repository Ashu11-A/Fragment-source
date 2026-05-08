import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Bot, CalendarClock, FileCode2, History, UserRound } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Badge, Button, Card, CardHeader, Empty, PageHeader, Section, Stat } from '@/components/fragment/primitives'
import { useTRPC } from '@/lib/trpc'

export const Route = createFileRoute('/dashboard/plugins/$pluginId')({
  component: PluginDetail,
})

function formatBytes(size?: number | null) {
  if (!size || size <= 0) return '0 MB'
  return `${(size / 1024 / 1024).toFixed(2)} MB`
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleString()
}

function statusTone(status: string) {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'destructive'
  return 'warning'
}

function PluginDetail() {
  const { pluginId } = Route.useParams()
  const trpc = useTRPC()
  const id = Number(pluginId)
  const pluginQuery = useQuery(trpc.plugins.get.queryOptions({ id }, { enabled: Number.isInteger(id) && id > 0 }))
  const plugin = pluginQuery.data

  return (
    <>
      <PageHeader
        title={plugin?.name ?? 'Plugin'}
        subtitle={plugin ? `Plugin #${plugin.id} by ${plugin.creator?.username ?? 'unknown'}` : 'Loading plugin details.'}
        actions={<Link to="/dashboard/plugins"><Button variant="secondary"><ArrowLeft className="h-4 w-4" /> Plugins</Button></Link>}
      />
      <Section>
        {pluginQuery.error && <Card className="mb-4 p-4 text-sm text-destructive">{pluginQuery.error.message}</Card>}
        {pluginQuery.isLoading ? (
          <Card className="p-5 text-sm text-muted-foreground">Loading plugin...</Card>
        ) : !plugin ? (
          <Empty icon={<FileCode2 className="h-8 w-8" />} title="Plugin not found" description="This plugin is not available or you do not have access." />
        ) : (
          <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Stat label="Status" value={<Badge tone={plugin.published ? 'success' : 'warning'}>{plugin.published ? 'published' : 'unpublished'}</Badge>} />
              <Stat label="Price" value={plugin.price === 0 ? 'Free' : `$${plugin.price.toFixed(2)}`} />
              <Stat label="Versions" value={plugin.releases.length} />
              <Stat label="Bots" value={plugin.bots?.length ?? 0} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="grid content-start gap-6">
                <Card>
                  <CardHeader title="Plugin Readme" />
                  <div className="max-h-80 overflow-y-auto p-5 text-sm leading-6 text-muted-foreground">
                    {plugin.readme ? <div className="whitespace-pre-wrap">{plugin.readme}</div> : 'No plugin readme has been provided.'}
                  </div>
                </Card>

                <Card>
                  <CardHeader title="Version History" />
                  {plugin.releases.length === 0 ? (
                    <div className="p-5 text-sm text-muted-foreground">No versions have been submitted.</div>
                  ) : (
                    <ul className="divide-y divide-border/60">
                      {plugin.releases.map((release) => (
                        <li key={release.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[1fr_auto]">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold">{release.name}</span>
                              <span className="text-xs text-muted-foreground">v{release.version}</span>
                              <Badge tone={statusTone(release.status)}>{release.status}</Badge>
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">{release.description}</div>
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span><FileCode2 className="mr-1 inline h-3.5 w-3.5" />{release.file?.name ?? 'missing file'}</span>
                              <span>{formatBytes(release.file?.size)}</span>
                              <span>Min core <span className="text-foreground">{release.minReleaseVersion}</span></span>
                              <span><CalendarClock className="mr-1 inline h-3.5 w-3.5" />{formatDate(release.createdAt)}</span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground lg:text-right">
                            <div>Submitted by <span className="text-foreground">{release.creator?.username ?? 'unknown'}</span></div>
                            {release.reviewedAt && (
                              <div className="mt-1">
                                Reviewed {formatDate(release.reviewedAt)}
                                {release.reviewer?.username ? ` by ${release.reviewer.username}` : ''}
                              </div>
                            )}
                          </div>
                          {(release.updates || release.readme || release.reviewNotes) && (
                            <div className="grid gap-3 lg:col-span-2 md:grid-cols-2">
                              {release.updates && (
                                <div className="rounded-md bg-muted/40 p-3 text-sm">
                                  <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Update Notes</div>
                                  <div className="whitespace-pre-wrap text-muted-foreground">{release.updates}</div>
                                </div>
                              )}
                              {release.readme && (
                                <div className="rounded-md bg-muted/40 p-3 text-sm">
                                  <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Version Readme</div>
                                  <div className="whitespace-pre-wrap text-muted-foreground">{release.readme}</div>
                                </div>
                              )}
                              {release.reviewNotes && (
                                <div className="rounded-md bg-muted/40 p-3 text-sm">
                                  <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Review Notes</div>
                                  <div className="whitespace-pre-wrap text-muted-foreground">{release.reviewNotes}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>

              <div className="grid content-start gap-6">
                <Card>
                  <CardHeader title="Plugin Info" />
                  <div className="grid gap-3 p-5 text-sm">
                    <Info icon={<UserRound className="h-4 w-4" />} label="Publisher" value={plugin.creator?.username ?? 'unknown'} />
                    <Info icon={<History className="h-4 w-4" />} label="Created" value={formatDate(plugin.createdAt)} />
                    <Info icon={<CalendarClock className="h-4 w-4" />} label="Updated" value={formatDate(plugin.updatedAt)} />
                    <Info icon={<Bot className="h-4 w-4" />} label="Assigned Bots" value={String(plugin.bots?.length ?? 0)} />
                  </div>
                </Card>

                <Card>
                  <CardHeader title="Description" />
                  <div className="p-5 text-sm leading-6 text-muted-foreground">
                    {plugin.description ?? 'No plugin description has been provided.'}
                  </div>
                </Card>

              </div>
            </div>
          </div>
        )}
      </Section>
    </>
  )
}

function Info({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">{icon}</div>
      <div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-foreground">{value}</div>
      </div>
    </div>
  )
}
