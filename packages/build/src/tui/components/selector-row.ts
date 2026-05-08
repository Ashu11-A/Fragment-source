import { TextAttributes, TextRenderable } from '@opentui/core'
import type { CliRenderer } from '@opentui/core'

export class SelectorRow {
  readonly renderable: TextRenderable
  private readonly label: string

  constructor(ctx: CliRenderer, label: string) {
    this.label      = label
    this.renderable = new TextRenderable(ctx, { content: `  [ ] ${label}`, fg: '#D1D5DB' })
  }

  update(hasCursor: boolean, isChecked: boolean): void {
    const prefix   = hasCursor ? '> ' : '  '
    const checkbox = isChecked ? '[X]' : '[ ]'
    this.renderable.content    = `${prefix}${checkbox} ${this.label}`
    this.renderable.fg         = hasCursor ? '#4ADE80' : '#D1D5DB'
    this.renderable.attributes = hasCursor ? TextAttributes.BOLD : 0
  }
}
