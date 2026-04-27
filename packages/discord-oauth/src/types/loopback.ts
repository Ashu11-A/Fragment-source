export type LoopbackCallbackParams = {
  code: string
  state: string
  redirect_uri: string
}

export type LoopbackOptions = {
  port?: number
  startUrl: string
  onCallback(params: LoopbackCallbackParams): Promise<void>
}
