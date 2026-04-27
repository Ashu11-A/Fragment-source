/** In-memory ring buffer of plain console lines per bot (core stdout/stderr mirror). */

const MAX_LINES = 6000

class ConsoleBuffer {
  private readonly buffers = new Map<number, string[]>()

  append(botId: number, lines: string[]): void {
    if (lines.length === 0) return
    let buf = this.buffers.get(botId)
    if (!buf) {
      buf = []
      this.buffers.set(botId, buf)
    }
    for (const line of lines) buf.push(line)
    if (buf.length > MAX_LINES) buf.splice(0, buf.length - MAX_LINES)
  }

  snapshot(botId: number, tail: number): string[] {
    const buf = this.buffers.get(botId)
    if (!buf || buf.length === 0) return []
    const n = Math.min(tail, buf.length)
    return buf.slice(buf.length - n)
  }

  clear(botId: number): void {
    this.buffers.delete(botId)
  }
}

export const consoleBuffer = new ConsoleBuffer()
