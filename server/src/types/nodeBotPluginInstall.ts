export type NodeBotPluginInstallInput = {
  botId: number
  containerName: string
  pluginDeployUrl: string
  envs?: string[]
}

export type NodeBotPluginInstallRequest = NodeBotPluginInstallInput & {
  requestId: string
}

export type NodeBotPluginInstallResultPayload = {
  requestId: string
  ok: boolean
  botId: number
  message?: string
  details?: string
}
