import { spawn } from 'node:child_process'

const CLIPBOARD_TIMEOUT_MS = 3000

export function writeToClipboard(bin: string, args: string[], text: string): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn(bin, args, { stdio: ['pipe', 'ignore', 'ignore'] })
    let settled = false

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        proc.kill('SIGKILL')
        resolve(false)
      }
    }, CLIPBOARD_TIMEOUT_MS)

    const finish = (ok: boolean) => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        resolve(ok)
      }
    }

    proc.on('error', () => finish(false))
    proc.on('close', (code) => finish(code === 0))
    proc.stdin.on('error', () => finish(false))
    proc.stdin.end(text, 'utf8')
  })
}

