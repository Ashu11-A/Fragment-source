import type { DaemonMessage } from './protocol.js'

// Protocolo de enquadramento: [4 bytes uint32 big-endian = comprimento][corpo JSON]
const HEADER_SIZE = 4

export class MessageFramer {
  private receiveBuffer: Buffer = Buffer.alloc(0)

  feed(incomingChunk: Buffer): DaemonMessage[] {
    this.receiveBuffer = Buffer.concat([this.receiveBuffer, incomingChunk])
    const parsedMessages: DaemonMessage[] = []

    while (this.receiveBuffer.length >= HEADER_SIZE) {
      const declaredBodyLength = this.receiveBuffer.readUInt32BE(0)
      const totalFrameLength = HEADER_SIZE + declaredBodyLength

      if (this.receiveBuffer.length < totalFrameLength) break

      const rawJsonBody = this.receiveBuffer
        .subarray(HEADER_SIZE, totalFrameLength)
        .toString('utf8')

      this.receiveBuffer = this.receiveBuffer.subarray(totalFrameLength)

      try {
        parsedMessages.push(JSON.parse(rawJsonBody) as DaemonMessage)
      } catch {
        // Quadro com JSON malformado é descartado silenciosamente
      }
    }

    return parsedMessages
  }

  frame(outgoingMessage: DaemonMessage): Buffer {
    const serializedBody = Buffer.from(JSON.stringify(outgoingMessage), 'utf8')
    const lengthHeader = Buffer.allocUnsafe(HEADER_SIZE)
    lengthHeader.writeUInt32BE(serializedBody.length, 0)
    return Buffer.concat([lengthHeader, serializedBody])
  }
}
