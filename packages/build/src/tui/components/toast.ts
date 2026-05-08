import { BoxRenderable, TextAttributes, TextRenderable } from '@opentui/core'
import type { CliRenderer } from '@opentui/core'

export class Toast {
  private readonly root: BoxRenderable
  private readonly label: TextRenderable
  private timer: ReturnType<typeof setTimeout> | null = null
  private visible = false

  constructor(private readonly ctx: CliRenderer) {
    this.label = new TextRenderable(ctx, { content: '', fg: '#D1FAE5', selectable: false })

    this.root = new BoxRenderable(ctx, {
      id: 'toast',
      position: 'absolute',
      right: 2,
      top: 1,
      paddingX: 2,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 1,
      backgroundColor: '#064E3B',
      borderStyle: 'single',
      borderColor: '#4ADE80',
    })

    this.root.add(new TextRenderable(ctx, { content: '✓', fg: '#4ADE80', attributes: TextAttributes.BOLD, selectable: false }))
    this.root.add(this.label)

    // Clicking the toast dismisses it so it does not block text selection underneath
    this.root.onMouseDown = () => this.hide()
  }

  show(message: string, durationMs = 2000): void {
    this.label.content = message

    if (this.timer !== null) clearTimeout(this.timer)

    if (!this.visible) {
      this.ctx.root.add(this.root)
      this.visible = true
    }

    this.timer = setTimeout(() => {
      this.hide()
    }, durationMs)
  }

  hide(): void {
    if (!this.visible) return
    this.ctx.root.remove(this.root.id)
    this.visible = false
    this.timer = null
  }
}
