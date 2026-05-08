import stripAnsi from 'strip-ansi'
import { emitCoreConsoleLines } from '@/events/socket.js'

const lineQueue: string[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

const FLUSH_MS = 120
const MAX_BATCH = 120

function scheduleFlush() {
  if (flushTimer != null) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    if (lineQueue.length === 0) return

    const batch = lineQueue.splice(0, MAX_BATCH)
    emitCoreConsoleLines(batch)

    if (lineQueue.length > 0) scheduleFlush()
  }, FLUSH_MS)
}

export function pokeMirrorFlush(): void {
  if (flushTimer != null) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  scheduleFlush()
}

function enqueueLine(rawLine: string) {
  const line = stripAnsi(rawLine)
  if (line.length === 0) return

  lineQueue.push(line)
  scheduleFlush()
}

function ingestStreamChunk(chunk: string, sink: { pending: string }): void {
  sink.pending += chunk.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  for (;;) {
    const index = sink.pending.indexOf('\n')
    if (index === -1) break
    const line = sink.pending.slice(0, index)
    sink.pending = sink.pending.slice(index + 1)
    enqueueLine(line)
  }
}

function patchWritable(stream: NodeJS.WriteStream, sink: { pending: string }) {
  const originalWrite = stream.write.bind(stream)

  stream.write = ((chunk: unknown, encoding?: unknown, callback?: unknown): boolean => {
    try {
      if (chunk != null) {
        const stringChunk =
          typeof chunk === 'string'
            ? chunk
            : Buffer.isBuffer(chunk)
              ? chunk.toString('utf8')
              : String(chunk)
        ingestStreamChunk(stringChunk, sink)
      }
    } catch {
      // never break stdout/stderr
    }
    return originalWrite(chunk, encoding as BufferEncoding, callback as (error?: Error | null) => void)
  }) as typeof stream.write
}

export class Logger {
  constructor() {
    const outSink = { pending: '' }
    const errSink = { pending: '' }
    patchWritable(process.stdout, outSink)
    patchWritable(process.stderr, errSink)
  }
}
