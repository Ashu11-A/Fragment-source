import { appendFileSync, mkdirSync, truncateSync, existsSync } from 'fs'
import { join } from 'path'
import stripAnsi from 'strip-ansi'
import { emitCoreConsoleLines, getMirrorReady } from './socket.js'

let logFilePath = ''
const lineQueue: string[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

const FLUSH_MS = 120
const RETRY_MS = 400
const MAX_BATCH = 120

function scheduleFlush() {
  if (flushTimer != null) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    if (lineQueue.length === 0) return

    if (!getMirrorReady()) {
      flushTimer = setTimeout(() => {
        flushTimer = null
        scheduleFlush()
      }, RETRY_MS)
      return
    }

    const batch = lineQueue.splice(0, MAX_BATCH)
    emitCoreConsoleLines(batch)

    if (lineQueue.length > 0) scheduleFlush()
  }, FLUSH_MS)
}

/** Call when `client:identify` may have just succeeded so queued lines can drain. */
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

  try {
    if (logFilePath) appendFileSync(logFilePath, `${line}\n`, 'utf8')
  } catch {
    // ignore disk errors
  }

  lineQueue.push(line)
  scheduleFlush()
}

function ingestStreamChunk(chunk: string, sink: { pending: string }): void {
  sink.pending += chunk.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  for (;;) {
    const i = sink.pending.indexOf('\n')
    if (i === -1) break
    const line = sink.pending.slice(0, i)
    sink.pending = sink.pending.slice(i + 1)
    enqueueLine(line)
  }
}

function patchWritable(stream: NodeJS.WriteStream, sink: { pending: string }) {
  const orig = stream.write.bind(stream) as (
    chunk: unknown,
    encoding?: unknown,
    cb?: unknown,
  ) => boolean

  stream.write = ((chunk: unknown, encoding?: unknown, cb?: unknown): boolean => {
    try {
      if (chunk != null) {
        const s =
          typeof chunk === 'string'
            ? chunk
            : Buffer.isBuffer(chunk)
              ? chunk.toString('utf8')
              : String(chunk)
        ingestStreamChunk(s, sink)
      }
    } catch {
      // never break stdout/stderr
    }
    return orig(chunk, encoding, cb)
  }) as typeof stream.write
}

/**
 * Mirrors stdout/stderr into `{root}/.fragment/console.log` (plain text) and streams lines to the server.
 * Install before any other startup output so the banner and boot logs are captured.
 */
export function startConsoleMirror(root: string): { logPath: string } {
  const dir = join(root, '.fragment')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  logFilePath = join(dir, 'console.log')
  try {
    truncateSync(logFilePath, 0)
  } catch {
    // ignore
  }

  const outSink = { pending: '' }
  const errSink = { pending: '' }
  patchWritable(process.stdout, outSink)
  patchWritable(process.stderr, errSink)

  return { logPath: logFilePath }
}
