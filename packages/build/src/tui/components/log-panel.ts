import { BoxRenderable, ScrollBoxRenderable, TextAttributes, TextRenderable } from '@opentui/core'
import type { CliRenderer } from '@opentui/core'

export class LogPanel {
  readonly root: BoxRenderable
  // ScrollBoxRenderable.content is ContentRenderable (internal type, extends BoxRenderable).
  // Assigning to BoxRenderable is a valid upcast — no cast operator needed.
  readonly logContent: BoxRenderable

  constructor(ctx: CliRenderer) {
    const scrollBox = new ScrollBoxRenderable(ctx, {
      id: 'log-scrollbox',
      flexGrow: 1,
      scrollY: true,
      scrollX: false,
      stickyScroll: true,
      stickyStart: 'bottom',
      border: false,
      contentOptions: {
        flexDirection: 'column',
        gap: 0,
        padding: 1,
      },
    })

    this.logContent = scrollBox.content  // ContentRenderable → BoxRenderable upcast

    this.root = new BoxRenderable(ctx, {
      id: 'log-panel',
      flexGrow: 1,
      flexDirection: 'column',
      borderStyle: 'single',
      borderColor: '#374151',
      backgroundColor: '#0B0F19',
    })

    this.root.add(new TextRenderable(ctx, { content: 'Logs', fg: '#9CA3AF', attributes: TextAttributes.BOLD, paddingLeft: 1, selectable: false }))
    this.root.add(scrollBox)
  }
}
