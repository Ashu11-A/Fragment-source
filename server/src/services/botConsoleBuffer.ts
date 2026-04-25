/** In-memory ring buffer of plain console lines per bot (core stdout/stderr mirror). */

const MAX_LINES = 6000
const buffers = new Map<number, string[]>()

export function appendBotConsoleLines(botId: number, lines: string[]): void {
  if (lines.length === 0) return
  let buf = buffers.get(botId)
  if (!buf) {
    buf = []
    buffers.set(botId, buf)
  }
  for (const line of lines) {
    buf.push(line)
  }
  if (buf.length > MAX_LINES) {
    buf.splice(0, buf.length - MAX_LINES)
  }
}

export function snapshotBotConsoleLines(botId: number, tail: number): string[] {
  const buf = buffers.get(botId)
  if (!buf || buf.length === 0) return []
  const n = Math.min(tail, buf.length)
  return buf.slice(buf.length - n)
}

/** Optional: clear when debugging */
export function clearBotConsoleBuffer(botId: number): void {
  buffers.delete(botId)
}
