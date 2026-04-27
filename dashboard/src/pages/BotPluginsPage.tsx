import { getRouteApi } from '@tanstack/react-router'
import { useCallback, useRef, useState } from 'react'
import { useBot } from '@/hooks/useBots'
import { trpc } from '@/lib/trpc'
import { fileToBase64 } from '@/lib/file-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { LoadingButton } from '@/components/LoadingButton'
import { BotNotFound } from '@/components/BotNotFound'
import { ErrorAlert } from '@/components/ErrorAlert'
import { Loader2, Power, Puzzle, RefreshCw, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PluginRow } from '@/types/app'

const botShellRouteApi = getRouteApi('/_authenticated/bots_/$botId')

export function BotPluginsPage() {
  const { botId } = botShellRouteApi.useParams()
  const { bot, isLoading: botLoading, isError, refetch: refetchBot } = useBot(botId)
  const numericId = Number.parseInt(String(botId), 10)
  const validId = !Number.isNaN(numericId) && numericId > 0

  const [uploadError, setUploadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [lastOk, setLastOk] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const statusQuery = trpc.bots.status.useQuery(
    { ids: validId ? [numericId] : [] },
    { enabled: validId, refetchInterval: 8_000 },
  )
  const online = statusQuery.data?.data?.[numericId] === true

  const listQuery = trpc.bots.corePlugins.list.useQuery(
    { botId: numericId },
    { enabled: validId && Boolean(bot) && online, retry: false },
  )

  const refetchList = useCallback(() => {
    void listQuery.refetch()
  }, [listQuery])

  const reloadMut = trpc.bots.corePlugins.reload.useMutation({
    onSuccess: (data) => {
      setActionError(null)
      setLastOk(data.message)
      void listQuery.refetch()
    },
    onError: (error) => setActionError(error.message),
  })
  const loadMut = trpc.bots.corePlugins.load.useMutation({
    onSuccess: (data) => {
      setActionError(null)
      setLastOk(data.message)
      void listQuery.refetch()
    },
    onError: (error) => setActionError(error.message),
  })
  const unloadMut = trpc.bots.corePlugins.unload.useMutation({
    onSuccess: (data) => {
      setActionError(null)
      setLastOk(data.message)
      void listQuery.refetch()
    },
    onError: (error) => setActionError(error.message),
  })
  const uploadMut = trpc.bots.corePlugins.upload.useMutation({
    onSuccess: (data) => {
      setUploadError(null)
      setLastOk(data.message)
      void listQuery.refetch()
    },
    onError: (error) => setUploadError(error.message),
  })

  if (botLoading) {
    return <LoadingSpinner text="A carregar…" />
  }

  if (!bot || isError) {
    return (
      <BotNotFound
        title="Bot não encontrado"
        message="Sem acesso a este bot."
        retryLabel="Tentar de novo"
        onRetry={() => refetchBot()}
      />
    )
  }

  const plugins: PluginRow[] = listQuery.data?.data?.plugins ?? []
  const listBlocked = !online

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in">
      <div>
        <div className="flex items-center gap-2">
          <Puzzle className="w-6 h-6 text-blurple-400" />
          <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">Plugins do core</h1>
        </div>
        <p className="text-sm text-surface-500 mt-1">
          Gestão em tempo real no processo do core de <span className="text-surface-300">{bot.name}</span>. O core tem de estar
          ligado ao servidor.
        </p>
        <div className="flex items-center gap-2 mt-3">
          <Badge
            variant="outline"
            className={cn(online && 'border-emerald-500/50 text-emerald-400/90')}
          >
            {online ? 'Core online' : 'Core offline — ligue o processo deste bot'}
          </Badge>
        </div>
      </div>

      {listQuery.error != null && online && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
          <p className="font-medium">Não foi possível listar os plugins</p>
          <p className="text-amber-200/80 mt-1">{listQuery.error.message}</p>
        </div>
      )}

      <ErrorAlert error={actionError} variant="detailed" />

      {lastOk && (
        <p className="text-sm text-emerald-500/90">{lastOk}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Upload de bundle</CardTitle>
          <CardDescription>
            Envie um ficheiro <code className="text-xs">plugin-&#123;nome&#125;.js</code>. O servidor grava em{' '}
            <code className="text-xs">FRAGMENT_CORE_PLUGINS_DIR</code> (ver documentação) e o core tenta carregar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".js,application/javascript"
              className="sr-only"
              tabIndex={-1}
              disabled={!online || uploadMut.isPending}
              onChange={async (event) => {
                setUploadError(null)
                setLastOk(null)
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file == null) return
                try {
                  const base64 = await fileToBase64(file)
                  await uploadMut.mutateAsync({ botId: numericId, fileName: file.name, contentBase64: base64 })
                } catch (error) {
                  setUploadError(error instanceof Error ? error.message : 'Falha no upload')
                }
              }}
            />
            <LoadingButton
              type="button"
              isLoading={uploadMut.isPending}
              disabled={!online}
              className="gap-2"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              {!uploadMut.isPending && <Upload className="w-4 h-4" />}
              Escolher ficheiro
            </LoadingButton>
          </div>
          <ErrorAlert error={uploadError} variant="detailed" title="Falha no carregamento do plugin" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Plugins</CardTitle>
            <CardDescription>
              Ativos estão carregados na memória; inativos existem no disco.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={!online || listQuery.isFetching}
            onClick={() => refetchList()}
          >
            {listQuery.isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          {listBlocked ? (
            <p className="text-sm text-surface-500">Ligue o core para ver e gerir os plugins.</p>
          ) : listQuery.isLoading ? (
            <LoadingSpinner text="A carregar lista…" paddingY="py-6" size="sm" />
          ) : plugins.length === 0 ? (
            <p className="text-sm text-surface-500">Nenhum plugin-*.js encontrado na pasta do core.</p>
          ) : (
            <ul className="space-y-3">
              {plugins.map((plugin) => (
                <li
                  key={plugin.filePath}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-surface-800/60 p-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-surface-100">{plugin.pluginName}</span>
                      {plugin.version != null && (
                        <Badge variant="outline" className="text-[10px] h-5">
                          {plugin.version}
                        </Badge>
                      )}
                      {plugin.loaded ? (
                        <Badge className="text-[10px] h-5 bg-emerald-500/20 text-emerald-300 border-emerald-500/30">Ativo</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] h-5 text-amber-300/90 border-amber-500/30">Inactivo</Badge>
                      )}
                    </div>
                    <p className="text-xs text-surface-500 break-all font-mono">{plugin.filePath}</p>
                    {plugin.description && (
                      <p className="text-xs text-surface-400 line-clamp-2">{plugin.description}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {plugin.loaded && (
                      <LoadingButton
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="gap-1.5 h-8"
                        isLoading={reloadMut.isPending}
                        onClick={() => reloadMut.mutate({ botId: numericId, filePath: plugin.filePath })}
                      >
                        {!reloadMut.isPending && <RefreshCw className="w-3.5 h-3.5" />}
                        Recarregar
                      </LoadingButton>
                    )}
                    {plugin.loaded && (
                      <LoadingButton
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="gap-1.5 h-8"
                        isLoading={unloadMut.isPending}
                        onClick={() => unloadMut.mutate({ botId: numericId, pluginName: plugin.pluginName })}
                      >
                        {!unloadMut.isPending && <Power className="w-3.5 h-3.5" />}
                        Desactivar
                      </LoadingButton>
                    )}
                    {!plugin.loaded && (
                      <LoadingButton
                        type="button"
                        size="sm"
                        className="gap-1.5 h-8"
                        isLoading={loadMut.isPending}
                        onClick={() => loadMut.mutate({ botId: numericId, filePath: plugin.filePath })}
                      >
                        {!loadMut.isPending && <Power className="w-3.5 h-3.5" />}
                        Activar
                      </LoadingButton>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
