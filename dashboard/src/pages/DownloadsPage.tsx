import { useEffect, useMemo, useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorAlert } from '@/components/ErrorAlert'
import { formatBytes, formatDateTime } from '@/lib/format-utils'
import { Download, Box, FileJson, ExternalLink, Server } from 'lucide-react'

function downloadHref(tag: string, assetId: number) {
  const query = new URLSearchParams({ tag, assetId: String(assetId) })
  return `/api/artifacts/download?${query.toString()}`
}

export function DownloadsPage() {
  const { data: listData, isLoading: listLoading, error: listError } = trpc.artifacts.releaseList.useQuery(
    { perPage: 20 },
  )

  const [selectedTag, setSelectedTag] = useState('')
  const [manualTag, setManualTag] = useState('')

  const releases = listData?.data.releases ?? []

  useEffect(() => {
    if (releases.length > 0 && !selectedTag) {
      setSelectedTag(releases[0].tagName)
    }
  }, [releases, selectedTag])

  const tagForQuery = selectedTag || manualTag || undefined

  const {
    data: catData,
    isLoading: catLoading,
    error: catError,
    refetch,
  } = trpc.artifacts.catalog.useQuery(
    { tag: tagForQuery },
    { enabled: true },
  )

  const catalog = catData?.data
  const coreAssets = useMemo(() => catalog?.assets.filter((asset) => asset.kind === 'core') ?? [], [catalog])
  const pluginAssets = useMemo(() => catalog?.assets.filter((asset) => asset.kind === 'plugin') ?? [], [catalog])
  const extraAssets = useMemo(
    () => catalog?.assets.filter((asset) => asset.kind === 'metadata' || asset.kind === 'other') ?? [],
    [catalog],
  )

  const isLoading = listLoading || catLoading
  const error = listError || catError

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="space-y-2 animate-slide-up">
        <div className="flex items-center gap-2">
          <Box className="w-7 h-7 text-blurple-400" />
          <h1 className="text-2xl font-bold text-surface-100">Distribuição</h1>
        </div>
        <p className="text-surface-400 text-sm max-w-2xl">
          Baixe os binários do <strong>core</strong> (por plataforma) e os bundles <strong>plugin-*.js</strong>{' '}
          publicados no GitHub Releases. O catálogo é obtido via API do GitHub (configurável no servidor).
        </p>
      </div>

      <ErrorAlert error={error?.message} />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Versão (release)</CardTitle>
              <CardDescription>
                Repositório:{' '}
                <span className="text-surface-300 font-mono text-xs">{catalog?.repository ?? '…'}</span>
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {releases.length > 0 ? (
                <select
                  value={selectedTag}
                  onChange={(event) => {
                    setSelectedTag(event.target.value)
                    setManualTag('')
                  }}
                  className="ui-select h-9 rounded-md px-3 text-sm min-w-[220px]"
                >
                  {releases.map((release) => (
                    <option key={release.tagName} value={release.tagName}>
                      {release.tagName} {release.prerelease ? '(pre) ' : ' '}
                      — {release.name.slice(0, 40)}
                      {release.name.length > 40 ? '…' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="ex: v0.0.5-canary"
                    value={manualTag}
                    onChange={(event) => {
                      setManualTag(event.target.value)
                      setSelectedTag('')
                    }}
                    className="h-9 w-56 text-sm"
                  />
                </div>
              )}
              <Button variant="secondary" size="sm" onClick={() => void refetch()}>
                Atualizar
              </Button>
              {catalog?.htmlUrl && (
                <a
                  href={catalog.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blurple-400 hover:text-blurple-300"
                >
                  Página do release
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </CardHeader>
        {catalog && (
          <CardContent className="pt-0 text-sm text-surface-500">
            {catalog.releaseName}
            <span className="mx-2">·</span>
            {formatDateTime(catalog.publishedAt)}
            <span className="mx-2">·</span>
            <span className="text-surface-400">tag {catalog.tag}</span>
          </CardContent>
        )}
      </Card>

      {isLoading && !catalog ? (
        <LoadingSpinner text="A carregar catálogo…" paddingY="py-16" />
      ) : !catalog ? (
        <p className="text-surface-500 text-sm">Não foi possível carregar o catálogo.</p>
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-surface-200 uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-blurple-400" />
              Core (binários)
            </h2>
            {coreAssets.length === 0 ? (
              <p className="text-surface-500 text-sm">Sem ficheiros core neste tag.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {coreAssets.map((asset) => (
                  <Card key={asset.id} className="ui-card-nested">
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-surface-200 truncate" title={asset.name}>
                          {asset.name}
                        </p>
                        <p className="text-xs text-surface-500 mt-0.5">{formatBytes(asset.size)}</p>
                      </div>
                      <Button size="sm" className="gap-1.5 shrink-0" asChild>
                        <a href={downloadHref(catalog.tag, asset.id)} download={asset.name}>
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-surface-200 uppercase tracking-wider flex items-center gap-2">
              <Box className="w-4 h-4 text-emerald-400" />
              Plugins
            </h2>
            {pluginAssets.length === 0 ? (
              <p className="text-surface-500 text-sm">Sem plugins .js neste tag.</p>
            ) : (
              <div className="space-y-2">
                {pluginAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="ui-list-row border flex items-center justify-between gap-3 rounded-lg px-4 py-3"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      {asset.pluginSlug && (
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {asset.pluginSlug}
                        </Badge>
                      )}
                      <div>
                        <p className="text-sm font-medium text-surface-200 truncate" title={asset.name}>
                          {asset.name}
                        </p>
                        <p className="text-xs text-surface-500">{formatBytes(asset.size)}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="secondary" className="gap-1.5 shrink-0" asChild>
                      <a href={downloadHref(catalog.tag, asset.id)} download={asset.name}>
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {extraAssets.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-surface-200 uppercase tracking-wider flex items-center gap-2">
                <FileJson className="w-4 h-4 text-amber-400" />
                Outros
              </h2>
              <div className="space-y-2">
                {extraAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="ui-list-row-muted border flex items-center justify-between gap-3 rounded-lg px-4 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-surface-200 truncate">{asset.name}</p>
                      <p className="text-xs text-surface-500">{formatBytes(asset.size)}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="shrink-0" asChild>
                      <a href={downloadHref(catalog.tag, asset.id)} download={asset.name}>
                        <Download className="w-4 h-3.5" />
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <p className="text-xs text-surface-600 border-t border-surface-800/50 pt-4">
            Sessão ativa requerida para o link de download redirecionar a partir do Fragment. Repositório:{' '}
            <a
              className="text-blurple-400 hover:underline"
              href="https://github.com/Ashu11-A/Fragment-source/releases"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ashu11-A/Fragment-source
            </a>
            .
          </p>
        </div>
      )}
    </div>
  )
}
