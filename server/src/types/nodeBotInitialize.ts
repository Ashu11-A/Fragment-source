export type NodeBotInitializeInput = {
  botId: number
  containerName: string
  tokenFetchUrl: string
}

export type NodeBotInitializeRequest = NodeBotInitializeInput & {
  requestId: string
}

export type NodeBotInitializeResultPayload = {
  requestId: string
  ok: boolean
  botId: number
  message?: string
  details?: string
}
