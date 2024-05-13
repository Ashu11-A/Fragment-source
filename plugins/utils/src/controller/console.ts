import { SocketClient } from "./socket";

export class console {
  constructor () {}

  static log (message?: any, ...optionalParams: any[]) {
    SocketClient.client.emit('console', { type: 'log', message, optionalParams })
  }
  static info (message?: any, ...optionalParams: any[]) {
    SocketClient.client.emit('console', { type: 'info', message, optionalParams })
  }
  static warn (message?: any, ...optionalParams: any[]) {
    SocketClient.client.emit('console', { type: 'warn', message, optionalParams })
  }
  static error (message?: any, ...optionalParams: any[]) {
    SocketClient.client.emit('console', { type: 'error', message, optionalParams })
  }
}