import { coreContract } from 'socket'
import { z } from 'zod'

export type PluginResult = z.infer<typeof coreContract.clientToServer['core:plugin:result']>
export type PluginEntry = NonNullable<PluginResult['plugins']>[number]
