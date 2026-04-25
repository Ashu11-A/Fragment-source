import { useBots } from '@/hooks/useBots'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchWithBadge } from '@/components/ui/SearchWithBadge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { DeleteConfirmationDialog } from '@/components/ui/DeleteConfirmationDialog'
import { LoadingButton } from '@/components/ui/LoadingButton'
import { IconTile } from '@/components/ui/IconTile'
import { formatDate } from '@/lib/format-utils'
import { Bot, Plus, MoreHorizontal, Power, Pencil, Trash2, Wifi, WifiOff } from 'lucide-react'

export function BotsPage() {
  const {
    search, setSearch,
    createOpen, setCreateOpen,
    editOpen, setEditOpen,
    deleteOpen, setDeleteOpen,
    botName, setBotName,
    setEditBotId,
    editBotName, setEditBotName,
    setDeleteBotId,
    deleteBotName, setDeleteBotName,
    loading, error, setError,
    bots, filtered, statuses, isLoading,
    handleCreate, handleEdit, handleToggle, handleDelete
  } = useBots()

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        icon={Bot}
        title="Bot Management"
        description="Create, configure, and manage your Discord bots."
        actions={
          <Button
            id="create-bot-button"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setBotName('')
              setError('')
              setCreateOpen(true)
            }}
          >
            <Plus className="w-4 h-4" /> New Bot
          </Button>
        }
      />

      <SearchWithBadge
        inputId="bots-search"
        value={search}
        onChange={setSearch}
        placeholder="Search bots..."
        count={filtered.length}
        itemLabel="bot"
      />

      {isLoading ? (
        <LoadingSpinner text="Loading bots..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Bot}
          title={bots.length === 0 ? 'No bots yet' : 'No bots match your search'}
          description={
            bots.length === 0
              ? 'Create your first bot to get started.'
              : 'Try a different search term.'
          }
          action={
            bots.length === 0 ? (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setBotName('')
                  setError('')
                  setCreateOpen(true)
                }}
              >
                <Plus className="w-4 h-4" /> Create Bot
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((bot, index) => (
            <Card
              key={bot.id}
              className="group hover:border-blurple-500/40 hover:-translate-y-1 transition-all duration-300 animate-slide-up"
              style={{ animationDelay: `${100 + index * 50}ms` }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center w-12 h-12">
                      <IconTile icon={Bot} variant="bots" interactive />
                      <div
                        className={`ui-status-ring-card absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${
                          statuses[bot.id] ? 'ui-guild-status-on' : 'ui-guild-status-off'
                        }`}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-base">{bot.name}</CardTitle>
                      <p className="text-xs text-surface-500 mt-0.5 flex items-center gap-1">
                        {statuses[bot.id] ? (
                          <>
                            <Wifi className="w-3 h-3 text-success" /> Online
                          </>
                        ) : (
                          <>
                            <WifiOff className="w-3 h-3 text-surface-500" /> Offline
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="w-4 h-4 text-surface-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditBotId(bot.id)
                          setEditBotName(bot.name)
                          setError('')
                          setEditOpen(true)
                        }}
                      >
                        <Pencil className="w-4 h-4 mr-2" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggle(bot.id, bot.enabled)}>
                        <Power className="w-4 h-4 mr-2" />
                        {bot.enabled ? 'Disable' : 'Enable'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-danger focus:text-danger"
                        onClick={() => {
                          setDeleteBotId(bot.id)
                          setDeleteBotName(bot.name)
                          setError('')
                          setDeleteOpen(true)
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between pt-2 border-t border-surface-800/50">
                  <span className="text-[10px] text-surface-600 uppercase tracking-wider">
                    Created {formatDate(bot.createdAt)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-surface-500">
                      {bot.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <Switch
                      checked={bot.enabled}
                      onCheckedChange={() => handleToggle(bot.id, bot.enabled)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Bot Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Bot</DialogTitle>
            <DialogDescription>Give your bot a name. You can change it later.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label
                htmlFor="new-bot-name"
                className="text-xs font-medium text-surface-400 uppercase tracking-wider"
              >
                Bot Name
              </label>
              <Input
                id="new-bot-name"
                placeholder="My Awesome Bot"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <ErrorAlert error={error} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <LoadingButton isLoading={loading} disabled={!botName.trim()} onClick={handleCreate}>
              Create Bot
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Bot Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Bot</DialogTitle>
            <DialogDescription>Enter a new name for your bot.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label
                htmlFor="edit-bot-name"
                className="text-xs font-medium text-surface-400 uppercase tracking-wider"
              >
                Bot Name
              </label>
              <Input
                id="edit-bot-name"
                value={editBotName}
                onChange={(e) => setEditBotName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
              />
            </div>
            <ErrorAlert error={error} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <LoadingButton isLoading={loading} disabled={!editBotName.trim()} onClick={handleEdit}>
              Save
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        isOpen={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Bot"
        description={
          <>
            Are you sure you want to delete{' '}
            <span className="font-semibold text-surface-200">{deleteBotName}</span>?
            This action cannot be undone and all associated subscriptions will be removed.
          </>
        }
        onConfirm={handleDelete}
        isLoading={loading}
        error={error}
        confirmLabel="Delete Bot"
      />
    </div>
  )
}
