import { BoxRenderable, TextAttributes, TextRenderable } from '@opentui/core'
import type { CliRenderer, KeyEvent } from '@opentui/core'
import type { ServiceName } from '@/types/index'
import type { SelectorAction } from '@/tui/types'
import { SelectorRow } from './selector-row'

export class SelectorScreen {
  readonly root: BoxRenderable

  private readonly rows: SelectorRow[]
  private readonly items: ReadonlyArray<Readonly<{ name: ServiceName; label: string }>>
  private readonly selection: Record<ServiceName, boolean>
  private cursorIndex = 0

  constructor(ctx: CliRenderer) {
    this.items = [
      { name: 'server',    label: 'Server'    },
      { name: 'daemon',    label: 'Daemon'    },
      { name: 'dashboard', label: 'Dashboard' },
    ]

    this.selection = { server: true, daemon: true, dashboard: true }
    this.rows      = this.items.map((item) => new SelectorRow(ctx, item.label))

    this.root = new BoxRenderable(ctx, {
      id: 'selector-screen',
      flexGrow: 1,
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1,
      backgroundColor: '#0D1117',
    })

    this.root.add(new TextRenderable(ctx, { content: 'Fragment Dev', fg: '#4ADE80', attributes: TextAttributes.BOLD }))
    this.root.add(new TextRenderable(ctx, { content: '' }))
    this.root.add(new TextRenderable(ctx, { content: 'Select services to start:', fg: '#9CA3AF' }))
    for (const row of this.rows) this.root.add(row.renderable)
    this.root.add(new TextRenderable(ctx, { content: '' }))
    this.root.add(new TextRenderable(ctx, { content: '↑↓ navigate  SPACE toggle  ENTER confirm  q quit', fg: '#6B7280' }))

    this.refresh()
  }

  handleKey(key: KeyEvent): SelectorAction {
    switch (key.name) {
    case 'up':
      this.cursorIndex = Math.max(0, this.cursorIndex - 1)
      this.refresh()
      return { kind: 'navigate' }
    case 'down':
      this.cursorIndex = Math.min(this.items.length - 1, this.cursorIndex + 1)
      this.refresh()
      return { kind: 'navigate' }
    case 'space': {
      const name = this.items[this.cursorIndex].name
      this.selection[name] = !this.selection[name]
      this.refresh()
      return { kind: 'navigate' }
    }
    case 'return': {
      const selected = this.items
        .filter((item) => this.selection[item.name])
        .map((item) => item.name)
      return { kind: 'confirm', selected }
    }
    case 'escape':
    case 'q':
      return { kind: 'quit' }
    default:
      return { kind: 'none' }
    }
  }

  private refresh(): void {
    for (let i = 0; i < this.rows.length; i++) {
      const item = this.items[i]
      this.rows[i].update(i === this.cursorIndex, this.selection[item.name])
    }
  }
}
