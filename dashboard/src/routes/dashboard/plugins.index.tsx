import { createFileRoute, Link } from '@tanstack/react-router'
import { PackagePlus, UploadCloud } from 'lucide-react'
import { FormEvent, useMemo, useState } from 'react'
import { Badge, Button, Card, CardHeader, Dialog, DialogContent, Empty, Field, Input, PageHeader, Section, Textarea } from '@/components/fragment/primitives'
import { usePlugin } from '@/hooks/usePlugin'
import { fileToBase64 } from '@/lib/fileBase64'

export const Route = createFileRoute('/dashboard/plugins/')({
  component: PluginManagement,
})

type SubmissionMode = 'plugin' | 'release'

type ReleaseMetadata = {
  plugins?: Array<{ name?: string }>
}

function PluginManagement() {
  const { plugins, requests, isLoading, isFetching, error, createPackageSubmission, createRelease, isCreatingPackageSubmission, isCreatingRelease } = usePlugin('management')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [mode, setMode] = useState<SubmissionMode>('plugin')
  const [pluginId, setPluginId] = useState('')
  const [price, setPrice] = useState('0')
  const [updates, setUpdates] = useState('')
  const [metadataFile, setMetadataFile] = useState<File | null>(null)
  const [bundleFiles, setBundleFiles] = useState<File[]>([])
  const [bundle, setBundle] = useState<File | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const latestByPlugin = useMemo(() => {
    const map = new Map<number, string>()
    for (const request of requests) {
      if (!map.has(request.plugin.id)) map.set(request.plugin.id, request.version)
    }
    return map
  }, [requests])

  const resetForm = () => {
    setPluginId('')
    setPrice('0')
    setUpdates('')
    setMetadataFile(null)
    setBundleFiles([])
    setBundle(null)
    setFormError(null)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError(null)
    if (mode === 'plugin') {
      if (!metadataFile || bundleFiles.length === 0) {
        setFormError('Select metadata.json and at least one compiled plugin bundle.')
        return
      }

      const metadataText = await metadataFile.text()
      let metadata: ReleaseMetadata
      try {
        metadata = JSON.parse(metadataText) as ReleaseMetadata
      } catch {
        setFormError('metadata.json is not valid JSON.')
        return
      }

      const expectedBundleNames = (metadata.plugins ?? [])
        .map((plugin) => plugin.name)
        .filter((name): name is string => typeof name === 'string' && name.length > 0)

      if (expectedBundleNames.length === 0) {
        setFormError('metadata.json does not list any plugin bundles.')
        return
      }

      const expectedBundleNamesSet = new Set(expectedBundleNames)
      const unknownBundleNames = bundleFiles
        .map((file) => file.name)
        .filter((name) => !expectedBundleNamesSet.has(name))

      if (unknownBundleNames.length > 0) {
        setFormError(`These files are not listed in metadata.json: ${unknownBundleNames.join(', ')}`)
        return
      }

      try {
        await createPackageSubmission({
          metadataBase64: btoa(unescape(encodeURIComponent(metadataText))),
          bundles: await Promise.all(bundleFiles.map(async (file) => ({
            fileName: file.name,
            mimeType: file.type || 'text/javascript',
            contentBase64: await fileToBase64(file),
          }))),
          price: Number(price),
          updates: updates || null,
        })
      } catch {
        setDialogOpen(false)
        return
      }
    } else {
      if (!metadataFile || !bundle) {
        setFormError('Select metadata.json and the compiled plugin bundle for this version.')
        return
      }

      const metadataText = await metadataFile.text()
      let metadata: ReleaseMetadata
      try {
        metadata = JSON.parse(metadataText) as ReleaseMetadata
      } catch {
        setFormError('metadata.json is not valid JSON.')
        return
      }

      const expectedBundleNames = (metadata.plugins ?? [])
        .map((plugin) => plugin.name)
        .filter((name): name is string => typeof name === 'string' && name.length > 0)

      if (!expectedBundleNames.includes(bundle.name)) {
        setFormError(`${bundle.name} is not listed in metadata.json.`)
        return
      }

      try {
        await createRelease({
          pluginId: Number(pluginId),
          metadataBase64: btoa(unescape(encodeURIComponent(metadataText))),
          bundle: {
            fileName: bundle.name,
            mimeType: bundle.type || 'text/javascript',
            contentBase64: await fileToBase64(bundle),
          },
          updates: updates || null,
        })
      } catch {
        setDialogOpen(false)
        return
      }
    }
    resetForm()
    setDialogOpen(false)
  }

  return (
    <>
      <PageHeader
        title="Plugin Management"
        subtitle="Submit plugins and manage compiled plugin versions."
        actions={<Button onClick={() => { setMode('plugin'); resetForm(); setDialogOpen(true) }}><PackagePlus className="h-4 w-4" /> Upload Package</Button>}
      />
      <Section>
        {error && <Card className="mb-4 p-4 text-sm text-destructive">{error}</Card>}
        {isLoading ? (
          <Card className="p-5 text-sm text-muted-foreground">Loading plugins...</Card>
        ) : plugins.length === 0 ? (
          <Empty icon={<UploadCloud className="h-8 w-8" />} title="No plugins yet" description="Upload metadata.json with one or more compiled plugin bundles to create plugin records." />
        ) : (
          <div className="grid gap-4">
            {plugins.map((plugin) => {
              const pluginRequests = requests.filter((request) => request.plugin.id === plugin.id)
              return (
                <Card key={plugin.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3 p-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-display text-lg font-bold">{plugin.name}</h2>
                        <Badge tone={plugin.published ? 'success' : 'warning'}>{plugin.published ? 'published' : 'unpublished'}</Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">{plugin.description ?? 'No description'}</div>
                      <div className="mt-2 text-xs text-muted-foreground">Latest submitted: <span className="text-foreground">{latestByPlugin.get(plugin.id) ?? 'none'}</span></div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link to="/dashboard/plugins/$pluginId" params={{ pluginId: String(plugin.id) }}>
                        <Button size="sm" variant="ghost">Details</Button>
                      </Link>
                      <Button size="sm" variant="secondary" disabled={isFetching} onClick={() => { setMode('release'); resetForm(); setPluginId(String(plugin.id)); setDialogOpen(true) }}>
                        <UploadCloud className="h-4 w-4" /> Submit Version
                      </Button>
                    </div>
                  </div>
                  <CardHeader title="Release Requests" />
                  <ul className="divide-y divide-border/60">
                    {pluginRequests.length === 0 ? (
                      <li className="px-5 py-3 text-sm text-muted-foreground">No versions submitted.</li>
                    ) : pluginRequests.map((request) => (
                      <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                        <div>
                          <div className="text-sm font-medium">{request.name} <span className="text-xs text-muted-foreground">v{request.version}</span></div>
                          <div className="text-xs text-muted-foreground">Min core {request.minReleaseVersion} · {new Date(request.createdAt).toLocaleString()}</div>
                        </div>
                        <Badge tone={request.status === 'approved' ? 'success' : request.status === 'rejected' ? 'destructive' : 'warning'}>{request.status}</Badge>
                      </li>
                    ))}
                  </ul>
                </Card>
              )
            })}
          </div>
        )}
      </Section>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent title={mode === 'plugin' ? 'Upload Plugin Package' : 'Submit Plugin Version'}>
          <form className="grid gap-3" onSubmit={(event) => void submit(event)}>
            {mode === 'plugin' && (
              <>
                <Field label="Metadata File" hint="Use the generated releases/metadata.json file.">
                  <Input type="file" accept=".json,application/json" onChange={(event) => setMetadataFile(event.target.files?.[0] ?? null)} required />
                </Field>
                <Field label="Plugin Bundles" hint="Select one or more generated plugin-*.js files listed in metadata.json.">
                  <Input type="file" accept=".js,.mjs,text/javascript,application/javascript" multiple onChange={(event) => setBundleFiles(Array.from(event.target.files ?? []))} required />
                </Field>
                <Field label="Price"><Input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} required /></Field>
                <Field label="Updates"><Textarea rows={2} value={updates} onChange={(event) => setUpdates(event.target.value)} /></Field>
              </>
            )}
            {mode === 'release' && (
              <>
                <Field label="Metadata File" hint="Use the metadata.json generated with this plugin version.">
                  <Input type="file" accept=".json,application/json" onChange={(event) => setMetadataFile(event.target.files?.[0] ?? null)} required />
                </Field>
                <Field label="Plugin Bundle" hint="Select the compiled plugin-*.js file for this plugin.">
                  <Input type="file" accept=".js,.mjs,text/javascript,application/javascript" onChange={(event) => setBundle(event.target.files?.[0] ?? null)} required />
                </Field>
                <Field label="Updates"><Textarea rows={2} value={updates} onChange={(event) => setUpdates(event.target.value)} /></Field>
              </>
            )}
            {formError && <div className="text-sm text-destructive">{formError}</div>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isCreatingPackageSubmission || isCreatingRelease}>Submit</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
