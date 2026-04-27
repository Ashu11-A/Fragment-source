export interface IoClientSocket<StoC, CtoS> {
  id?: string | undefined
  connected: boolean
  connect(): this
  disconnect(): this
  on<K extends string & keyof StoC>(event: K, listener: StoC[K & keyof StoC]): this
  on(event: 'connect', listener: () => void): this
  on(event: 'disconnect', listener: (reason: string) => void): this
  on(event: 'connect_error', listener: (error: Error) => void): this
  off<K extends string & keyof StoC>(event: K, listener?: StoC[K & keyof StoC]): this
  off(event: 'connect' | 'disconnect' | 'connect_error', listener?: (...args: never[]) => void): this
  emit<K extends string & keyof CtoS>(event: K, ...args: Parameters<CtoS[K & keyof CtoS] & ((...args: never[]) => void)>): this
  io: {
    on(event: 'reconnect', listener: (attempt: number) => void): void
    on(event: 'reconnect_attempt', listener: (attempt: number) => void): void
    on(event: 'reconnect_error', listener: (error: Error) => void): void
    on(event: 'reconnect_failed', listener: () => void): void
  }
}
