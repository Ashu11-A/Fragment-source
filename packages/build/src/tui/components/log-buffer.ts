import { TextRenderable } from '@opentui/core'
import type { BoxRenderable, CliRenderer } from '@opentui/core'
import { stripAnsi } from '@/utils'
import { MAX_LOG_LINES } from '@/tui/constants'
import type { LogEntry } from '@/tui/types'
import { DebugLogger } from '@/tui/utils/debug-logger'

export class LogBuffer {
  private readonly ctx: CliRenderer
  private readonly logger: DebugLogger
  private readonly maxLines: number
  private readonly queue: LogEntry[] = []
  private flushPending = false
  private lineCount = 0
  private target: BoxRenderable | null = null

  constructor(ctx: CliRenderer, logger: DebugLogger, maxLines = MAX_LOG_LINES) {
    this.ctx    = ctx
    this.logger = logger
    this.maxLines = maxLines
  }

  attach(target: BoxRenderable): void {
    this.target = target
    this.scheduleFlush()
  }

  append(source: string, line: string): void {
    const clean = stripAnsi(line)
    this.logger.write(`[${source}] ${clean}`)
    this.queue.push({ source, line: clean })
    this.scheduleFlush()
  }

  private scheduleFlush(): void {
    if (!this.flushPending) {
      this.flushPending = true
      setImmediate(() => this.flush())
    }
  }

  private flush(): void {
    this.flushPending = false
    if (this.target === null || this.queue.length === 0) return

    for (const { source, line } of this.queue) {
      this.target.add(
        new TextRenderable(this.ctx, { content: line, fg: LogBuffer.fgForSource(source) })
      )
      this.lineCount++
    }
    this.queue.length = 0

    while (this.lineCount > this.maxLines) {
      const children = this.target.getChildren()
      if (children.length === 0) break
      this.target.remove(children[0].id)
      this.lineCount--
    }
  }

  private static fgForSource(source: string): string {
    switch (source) {
    case 'devlop':    return '#C084FC'
    case 'plugin':    return '#FBBF24'
    case 'server':    return '#5B8DEF'
    case 'daemon':    return '#4ADE80'
    case 'dashboard': return '#22D3EE'
    case 'node':      return '#C084FC'
    default:          return '#D1D5DB'
    }
  }
}
