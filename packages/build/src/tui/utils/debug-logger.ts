import { appendFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

export class DebugLogger {
  private readonly filePath: string

  constructor(filePath: string) {
    this.filePath = filePath
    try {
      mkdirSync(dirname(filePath), { recursive: true })
      writeFileSync(filePath, `=== Fragment Dev ${new Date().toISOString()} ===\n`)
    } catch (err) {
      console.error('[DebugLogger] Failed to initialize log file:', err)
    }
    process.on('uncaughtException', (err) =>
      this.write(`[UNCAUGHT] ${err.stack ?? String(err)}`)
    )
    process.on('unhandledRejection', (reason) =>
      this.write(
        `[UNHANDLED] ${reason instanceof Error ? (reason.stack ?? String(reason)) : String(reason)}`
      )
    )
  }

  write(line: string): void {
    try {
      appendFileSync(this.filePath, line + '\n')
    } catch (err) {
      console.error('[DebugLogger] Failed to write log:', err)
    }
  }
}
