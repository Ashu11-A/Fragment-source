import 'reflect-metadata'
import './index.js'
import './register.js'

import { Crons } from 'discord'
import { SocketClient } from 'socket-client'
import { metadata } from 'utils'
import { Cli } from 'cli'

declare let self: Worker
const postMessage = (message: unknown) => {
  message = typeof message === 'object'
    ? JSON.stringify(message)
    : JSON.stringify({ message })
  self.postMessage(message)
}

const rootDirectory = process.cwd()

self.onmessage = async (event: MessageEvent) => {
  const receivedArgs: Record<string, boolean | number>[] = Array.from(event.data)

  await Crons.register()

  if (receivedArgs.length === 0) {
    new SocketClient({ port: 3000, path: rootDirectory })
    postMessage('SocketClient started on port 3000')
    return
  }

  new Cli({
    functions: {
      info: () => {
        postMessage({ metadata: metadata() })
      },
      port: (port) => {
        new SocketClient({ port: parseFloat(String(port)), path: rootDirectory })
        postMessage(`SocketClient started on port ${parseFloat(String(port))}`)
      }
    }
  })
}
