import { DockerManager } from '../docker/manager.js'

export class LogAggregator {
  private readonly docker: DockerManager
  private readonly activeStreams = new Map<string, () => void>()
  private readonly logBuffer = new Map<string, string[]>()
  private flushInterval: NodeJS.Timeout | null = null

  constructor(docker: DockerManager) {
    this.docker = docker
  }

  async start(): Promise<void> {
    this.flushInterval = setInterval(() => {
      this.flushBuffers()
    }, 1000)
  }

  stop(): void {
    this.flushInterval && clearInterval(this.flushInterval)
    for (const [containerId, stopFn] of this.activeStreams) {
      stopFn()
      this.activeStreams.delete(containerId)
    }
  }

  startStreaming(
    containerId: string,
    onBatch: (lines: string[]) => void
  ): void {
    if (this.activeStreams.has(containerId)) return

    const buffer: string[] = []
    this.logBuffer.set(containerId, buffer)

    let running = true
    const stopFn = () => {
      running = false
    }

    this.activeStreams.set(containerId, stopFn)

    this.docker.streamLogs(containerId, (line) => {
      if (!running) return
      buffer.push(line)
    })

    this.flushBuffers = () => {
      for (const [id, lines] of this.logBuffer) {
        if (lines.length === 0) continue
        onBatch([...lines])
        lines.length = 0
      }
    }
  }

  stopStreaming(containerId: string): void {
    const stopFn = this.activeStreams.get(containerId)
    if (stopFn) {
      stopFn()
      this.activeStreams.delete(containerId)
      this.logBuffer.delete(containerId)
    }
  }

  private flushBuffers(): void {}
}
