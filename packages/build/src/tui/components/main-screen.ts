import { BoxRenderable, TextAttributes, TextRenderable } from '@opentui/core'
import type { CliRenderer } from '@opentui/core'
import { LogPanel } from './log-panel'
import { SidebarPanel } from './sidebar-panel'

export class MainScreen {
  readonly root: BoxRenderable
  readonly sidebar: SidebarPanel
  readonly logPanel: LogPanel

  constructor(ctx: CliRenderer) {
    this.root    = new BoxRenderable(ctx, { id: 'main-screen', flexGrow: 1, flexDirection: 'column' })
    this.sidebar = new SidebarPanel(ctx)
    this.logPanel = new LogPanel(ctx)

    const header = new BoxRenderable(ctx, {
      height: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 1,
      paddingRight: 1,
      backgroundColor: '#1F2937',
    })
    header.add(new TextRenderable(ctx, { content: ' Fragment Dev ', fg: '#4ADE80', attributes: TextAttributes.BOLD, selectable: false }))
    header.add(new TextRenderable(ctx, { content: ' | Press ? for help', fg: '#6B7280', selectable: false }))

    const content = new BoxRenderable(ctx, { flexGrow: 1, flexDirection: 'row', gap: 1, padding: 1 })
    content.add(this.sidebar.root)
    content.add(this.logPanel.root)

    const footer = new BoxRenderable(ctx, {
      height: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 1,
      paddingRight: 1,
      backgroundColor: '#1F2937',
    })
    footer.add(new TextRenderable(ctx, { content: ' 1-5:start  4:rebuild  q:quit  ?:help ', fg: '#6B7280', selectable: false }))

    this.root.add(header)
    this.root.add(content)
    this.root.add(footer)
  }
}
