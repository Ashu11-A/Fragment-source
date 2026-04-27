export type CorePluginRequest =
  | { requestId: string; action: 'list' }
  | { requestId: string; action: 'reload'; filePath: string }
  | { requestId: string; action: 'unload'; pluginName: string }
  | { requestId: string; action: 'load'; filePath: string }

export type CorePluginResultPayload = {
  requestId: string
  ok: boolean
  action: 'list' | 'reload' | 'unload' | 'load'
  message?: string
  details?: string
  plugins?: Array<{
    pluginName: string
    filePath: string
    version?: string
    description?: string | null
    loaded: boolean
  }>
  pluginName?: string
  filePath?: string
}

export type CorePluginActionInput =
  | { action: 'list' }
  | { action: 'reload'; filePath: string }
  | { action: 'unload'; pluginName: string }
  | { action: 'load'; filePath: string }
