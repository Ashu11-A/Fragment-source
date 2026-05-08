export type NodeUploadedFile = {
  path: string
  contentBase64: string
}

export type NodeInstanceCreateInput = {
  action: 'create'
  name: string
  image?: 'oven/bun:latest'
  botId?: number
  pluginId?: number
  pluginDeployUrl?: string
  tokenFetchUrl?: string
  startCommand?: string
  envs?: string[]
  ports?: Record<string, string>
  memoryLimitMb?: number
  cpuLimitPercentage?: number
  files?: NodeUploadedFile[]
}

export type NodeInstanceActionName = 'start' | 'stop' | 'restart'

export type NodeInstanceActionInput = {
  action: NodeInstanceActionName
  name: string
  botId?: number
}

export type NodeInstanceRequest = Omit<NodeInstanceCreateInput, 'image' | 'files'> & {
  requestId: string
  image: 'oven/bun:latest'
  files: NodeUploadedFile[]
}

export type NodeInstanceActionRequest = NodeInstanceActionInput & {
  requestId: string
}

export type NodeInstanceResultPayload = {
  requestId: string
  ok: boolean
  action: 'create' | NodeInstanceActionName
  message?: string
  details?: string
  instance?: {
    id: number
    container_id?: string | null
    name: string
    image: string
    status: string
    ports?: string | null
    env_vars?: string | null
    volume_name?: string | null
  }
}
