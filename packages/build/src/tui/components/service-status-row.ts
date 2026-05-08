import { BoxRenderable, TextRenderable } from '@opentui/core'
import type { CliRenderer } from '@opentui/core'
import { services } from '@/dev/services'
import type { ServiceName, ServiceStatus } from '@/types/index'
import { SERVICE_COLORS, STATUS_COLORS, STATUS_SYMBOLS } from '@/tui/constants'

export class ServiceStatusRow {
  readonly root: BoxRenderable

  private readonly symbolText: TextRenderable
  private readonly statusText: TextRenderable
  private readonly pidText: TextRenderable

  constructor(ctx: CliRenderer, name: ServiceName) {
    const def   = services[name]
    const color = SERVICE_COLORS[name]

    this.symbolText = new TextRenderable(ctx, { content: STATUS_SYMBOLS.idle, fg: STATUS_COLORS.idle })
    this.statusText = new TextRenderable(ctx, { content: 'idle',              fg: STATUS_COLORS.idle })
    this.pidText    = new TextRenderable(ctx, { content: '',                  fg: '#4B5563'           })

    this.root = new BoxRenderable(ctx, { flexDirection: 'row', gap: 1 })
    this.root.add(this.symbolText)
    this.root.add(new TextRenderable(ctx, { content: def.label.padEnd(9), fg: color }))
    this.root.add(this.statusText)
    this.root.add(this.pidText)
  }

  update(status: ServiceStatus, pid: number | undefined): void {
    const color = STATUS_COLORS[status]
    const symbol = STATUS_SYMBOLS[status]
    this.symbolText.content    = symbol
    this.symbolText.fg         = color
    this.statusText.content    = status
    this.statusText.fg         = color
    this.pidText.content       = pid !== undefined ? `(${pid})` : ''
  }
}
