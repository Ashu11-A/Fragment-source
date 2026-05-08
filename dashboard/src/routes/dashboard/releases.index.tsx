import { createFileRoute } from '@tanstack/react-router'
import { Boxes, UploadCloud } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { Badge, Button, Card, Dialog, DialogContent, Empty, Field, Input, PageHeader, Section } from '@/components/fragment/primitives'
import { useReleases } from '@/hooks/useReleases'
import { fileToBase64 } from '@/lib/fileBase64'

export const Route = createFileRoute('/dashboard/releases/')({
  component: CoreReleases,
})

function CoreReleases() {
  const { releases, isLoading, isFetching, error, createRelease, updateRelease, isCreating, isUpdating } = useReleases()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [latest, setLatest] = useState(true)
  const [bundle, setBundle] = useState<File | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const openCreate = () => {
    setEditingId(null)
    setLatest(true)
    setBundle(null)
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (release: typeof releases[number]) => {
    setEditingId(release.id)
    setLatest(release.latest)
    setBundle(null)
    setFormError(null)
    setDialogOpen(true)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    const payload = bundle
      ? {
          bundleBase64: await fileToBase64(bundle),
          bundleFileName: bundle.name,
          bundleMimeType: bundle.type || 'application/javascript',
        }
      : null

    if (!editingId && !payload) {
      setFormError('Select the compiled core release bundle.')
      return
    }

    if (editingId) {
      await updateRelease({ releaseId: editingId, latest, ...(payload ?? {}) })
    } else if (payload) {
      await createRelease({ latest, ...payload })
    }
    setDialogOpen(false)
  }

  return (
    <>
      <PageHeader
        title="Core Releases"
        subtitle="Manage compiled core builds used when creating bots."
        actions={<Button onClick={openCreate}><UploadCloud className="h-4 w-4" /> New Release</Button>}
      />
      <Section>
        {error && <Card className="mb-4 p-4 text-sm text-destructive">{error}</Card>}
        {isLoading ? (
          <Card className="p-5 text-sm text-muted-foreground">Loading releases...</Card>
        ) : releases.length === 0 ? (
          <Empty icon={<Boxes className="h-8 w-8" />} title="No core releases" description="Create a release so bot creation can select a core build." action={<Button onClick={openCreate}>Create Release</Button>} />
        ) : (
          <div className="grid gap-3">
            {releases.map((release) => (
              <Card key={release.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg font-bold">{release.file?.name ?? 'unknown'}</h2>
                    <span className="text-xs text-muted-foreground">v{release.version}</span>
                    {release.latest && <Badge tone="success">latest</Badge>}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Bots: <span className="text-foreground">{release.bots?.length ?? 0}</span>
                    {' · '}Created: <span className="text-foreground">{new Date(release.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <Button size="sm" variant="secondary" disabled={isFetching} onClick={() => openEdit(release)}>Edit</Button>
              </Card>
            ))}
          </div>
        )}
      </Section>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent title={editingId ? 'Edit Core Release' : 'Create Core Release'}>
          <form className="grid gap-3" onSubmit={(event) => void submit(event)}>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={latest} onChange={(event) => setLatest(event.target.checked)} />
              Latest release
            </label>
            <Field label="Compiled Core Bundle">
              <Input type="file" accept=".js,.mjs,application/javascript" onChange={(event) => setBundle(event.target.files?.[0] ?? null)} required={!editingId} />
            </Field>
            {formError && <div className="text-sm text-destructive">{formError}</div>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isCreating || isUpdating}>Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
