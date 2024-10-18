/* eslint-disable @typescript-eslint/no-explicit-any */
import { SocketClient } from '../class/Client'

global.console = {
  ...global.console,
  log (message?: any, ...optionalParams: any[]) {
    if (SocketClient.client?.connected) {
      return SocketClient.client.emit('console', { type: 'log', message, optionalParams })
    }
    process.stdout.write('📡 Socket is Disconnected\n')
    process.stdout.write(message, ...optionalParams)
    process.stdout.write('\n')
  },
  info (message?: any, ...optionalParams: any[]) {
    if (SocketClient.client?.connected) {
      return SocketClient.client.emit('console', { type: 'info', message, optionalParams })
    }
    process.stdout.write('📡 Socket is Disconnected\n')
    process.stdout.write(message, ...optionalParams)
    process.stdout.write('\n')
  },
  warn (message?: any, ...optionalParams: any[]) {
    if (SocketClient.client?.connected) {
      return SocketClient.client.emit('console', { type: 'warn', message, optionalParams })
    }
    process.stdout.write('📡 Socket is Disconnected\n')
    process.stdout.write(message, ...optionalParams)
    process.stdout.write('\n')
  },
  error (message?: any, ...optionalParams: any[]) {
    if (SocketClient.client?.connected) {
      return SocketClient.client.emit('console', { type: 'error', message, optionalParams })
    }
    process.stdout.write('📡 Socket is Disconnected\n')
    process.stdout.write(message, ...optionalParams)
    process.stdout.write('\n')
  }
}