import { createFileRoute } from '@tanstack/react-router'
import { Card, CardHeader, PageHeader, Section, Stat } from '@/components/fragment/primitives'
import { usePlugin } from '@/hooks/usePlugin'
import { OptionSelect } from '@/routes/shared/-RouteControls'
import { DashboardDataTable, type DashboardTableColumn } from '@/routes/shared/-DashboardDataTable'

export const Route = createFileRoute('/dashboard/publisher/stats')({
  component: CreatorStats,
})

const periods = ['monthly', 'quarterly', 'semiannual'] as const

function CreatorStats() {
  const { period, setPeriod, stats, isLoading } = usePlugin('creatorStats', 'monthly')

  const topPluginColumns: DashboardTableColumn[] = [
    { key: 'plugin', label: 'Plugin' },
    { key: 'sales', label: 'Sales' },
    { key: 'revenue', label: 'Revenue' },
  ]

  const pluginRows = stats?.plugins ?? []
  const maxRevenue = Math.max(...pluginRows.map((plugin) => plugin.sellerAmount), 0)

  return (
    <>
      <PageHeader title="Creator Stats" subtitle="Analytics for your plugins" actions={<OptionSelect value={period} onChange={setPeriod} options={periods} />} />
      <Section>
        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Total Revenue" value={`$${(stats?.totals.sellerAmount ?? 0).toFixed(2)}`} />
          <Stat label="Gross Volume" value={`$${(stats?.totals.grossAmount ?? 0).toFixed(2)}`} />
          <Stat label="Fees" value={`$${(stats?.totals.feeAmount ?? 0).toFixed(2)}`} />
          <Stat label="Sales" value={stats?.totals.count ?? 0} />
        </div>
      </Section>
      <Section className="pt-0">
        <Card>
          <CardHeader title="Revenue by Plugin" />
          <div className="space-y-2 p-5">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading stats...</p>
            ) : pluginRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No paid sales for this period.</p>
            ) : (
              pluginRows.map((plugin) => {
                const width = maxRevenue === 0 ? 0 : Math.round((plugin.sellerAmount / maxRevenue) * 100)
                return (
                  <div key={plugin.pluginId}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span>{plugin.pluginName}</span>
                      <span>${plugin.sellerAmount.toFixed(2)}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Card>
      </Section>
      <Section className="pt-0">
        <Card>
          <CardHeader title="Top Plugins" />
          <DashboardDataTable columns={topPluginColumns}>
            {pluginRows.map((plugin) => (
              <tr key={plugin.pluginId} className="hover:bg-accent/30">
                <td className="px-5 py-3 font-medium">{plugin.pluginName}</td>
                <td className="px-5 py-3 text-muted-foreground">{plugin.sales}</td>
                <td className="px-5 py-3 text-muted-foreground">${plugin.sellerAmount.toFixed(2)}</td>
              </tr>
            ))}
          </DashboardDataTable>
        </Card>
      </Section>
    </>
  )
}
