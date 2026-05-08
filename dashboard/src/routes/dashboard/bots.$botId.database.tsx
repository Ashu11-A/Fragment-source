import { createFileRoute } from '@tanstack/react-router'
import { Download, Eye, Trash2, Play } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button, Card, CardHeader, Section, Textarea } from '@/components/fragment/primitives'
import { buildTableDefinitions } from '@/lib/database-table'
import { useBot } from '@/hooks/useBots'
import { DashboardDataTable, type DashboardTableColumn } from '@/routes/shared/-DashboardDataTable'
import { useBotRouteContext } from '@/routes/hooks/-useBotRouteContext'

export const Route = createFileRoute('/dashboard/bots/$botId/database')({
  component: BotDB,
})

function BotDB() {
  const { botId } = Route.useParams()
  const { bot } = useBotRouteContext(botId)
  const activity = useBot('activity', bot?.id, Boolean(bot), { maxRows: 120 })

  const tables = useMemo(() => {
    return buildTableDefinitions(bot?.name ?? 'Unknown', activity.rows)
  }, [activity.rows, bot?.name])

  const [selectedTableName, setSelectedTableName] = useState<string>('')
  const [queryText, setQueryText] = useState('')

  useEffect(() => {
    if (tables.length === 0) return
    if (selectedTableName.length > 0 && tables.some((table) => table.name === selectedTableName)) return
    setSelectedTableName(tables[0].name)
    setQueryText(`SELECT * FROM ${tables[0].name}\nLIMIT 25;`)
  }, [selectedTableName, tables])

  const selectedTable = tables.find((table) => table.name === selectedTableName) ?? null

  const tableColumns: DashboardTableColumn[] = [
    { key: 'table', label: 'Table' },
    { key: 'records', label: 'Records' },
    { key: 'engine', label: 'Engine' },
    { key: 'actions', label: 'Actions', className: 'text-right' },
  ]

  const queryColumns: DashboardTableColumn[] = (selectedTable?.columns ?? []).map((column) => ({
    key: column,
    label: column,
    className: 'px-3 py-2',
  }))

  const queryRows = useMemo(() => {
    if (!selectedTable) return []
    return selectedTable.rows.slice(0, 25)
  }, [selectedTable])

  return (
    <Section>
      <div className="grid gap-6">
        <Card>
          <CardHeader title="Tables" />
          <DashboardDataTable columns={tableColumns}>
            {tables.map((table) => (
              <tr key={table.name} className="hover:bg-accent/30">
                <td className="px-5 py-3 font-mono">{table.name}</td>
                <td className="px-5 py-3 text-muted-foreground">{table.rows.length.toLocaleString()}</td>
                <td className="px-5 py-3 text-muted-foreground">{table.engine}</td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setSelectedTableName(table.name)}><Eye className="h-3.5 w-3.5" /> View</Button>
                    <Button size="sm" variant="ghost" disabled><Download className="h-3.5 w-3.5" /> Export</Button>
                    <Button size="sm" variant="ghost" disabled className="text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /> Truncate</Button>
                  </div>
                </td>
              </tr>
            ))}
          </DashboardDataTable>
        </Card>

        <Card>
          <CardHeader title="SQL Query" action={<Button size="sm" disabled><Play className="h-3.5 w-3.5" /> Run Query</Button>} />
          <div className="p-5">
            <Textarea rows={5} className="font-mono" value={queryText} onChange={(event) => setQueryText(event.target.value)} />
            <div className="mt-4 overflow-hidden rounded-md border border-border/60">
              {selectedTable && queryColumns.length > 0 ? (
                <DashboardDataTable
                  columns={queryColumns}
                  headClassName="bg-sidebar-rail/40 text-left text-xs uppercase tracking-wider text-muted-foreground"
                  bodyClassName="divide-y divide-border/60 font-mono"
                >
                  {queryRows.map((row, rowIndex) => (
                    <tr key={`${selectedTable.name}-${rowIndex}`} className="hover:bg-accent/30">
                      {selectedTable.columns.map((column) => (
                        <td key={column} className="px-3 py-2 text-muted-foreground">{row[column]}</td>
                      ))}
                    </tr>
                  ))}
                </DashboardDataTable>
              ) : (
                <div className="p-4 text-sm text-muted-foreground">No table selected.</div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </Section>
  )
}
