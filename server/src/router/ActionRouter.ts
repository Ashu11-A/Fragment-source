import type { DaemonEventHandler, EventMessage } from '../socket/protocol.js'

export class ActionRouter {
  private readonly registeredHandlers: Map<string, DaemonEventHandler> = new Map()

  on(eventName: string, handler: DaemonEventHandler): void {
    this.registeredHandlers.set(eventName, handler)
  }

  async route(incomingEvent: EventMessage, originDaemonId: string): Promise<void> {
    const matchedHandler = this.registeredHandlers.get(incomingEvent.event)

    if (!matchedHandler) {
      console.warn(`[ActionRouter] Evento sem handler registrado: '${incomingEvent.event}'`)
      return
    }

    try {
      await matchedHandler(incomingEvent.payload, originDaemonId)
    } catch (handlerError) {
      const errorMessage =
        handlerError instanceof Error ? handlerError.message : String(handlerError)
      console.error(
        `[ActionRouter] Falha ao processar evento '${incomingEvent.event}': ${errorMessage}`,
      )
    }
  }
}
