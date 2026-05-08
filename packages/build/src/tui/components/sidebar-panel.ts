import { BoxRenderable, TextAttributes, TextRenderable } from '@opentui/core'
import type { CliRenderer } from '@opentui/core'
import { processes, services, statuses } from '@/dev/services'
import type { ServiceName } from '@/types/index'
import { ServiceStatusRow } from './service-status-row'

export class SidebarPanel {
  readonly root: BoxRenderable

  private readonly rows: Readonly<Record<ServiceName, ServiceStatusRow>>

  constructor(ctx: CliRenderer) {
    this.root = new BoxRenderable(ctx, {
      id: 'sidebar',
      width: 28,
      flexDirection: 'column',
      padding: 1,
      borderStyle: 'single',
      borderColor: '#374151',
      backgroundColor: '#111827',
    })

    this.root.add(new TextRenderable(ctx, { content: 'Services', fg: '#9CA3AF', attributes: TextAttributes.BOLD, selectable: false }))

    const rows = {} as Record<ServiceName, ServiceStatusRow>
    for (const name of Object.keys(services) as ServiceName[]) {
      const row = new ServiceStatusRow(ctx, name)
      rows[name] = row
      this.root.add(row.root)
    }
    this.rows = rows
  }

  refresh(): void {
    for (const name of Object.keys(this.rows) as ServiceName[]) {
      const status = statuses[name]
      const pid    = processes[name]?.pid
      this.rows[name].update(status, pid)
    }
  }
}
