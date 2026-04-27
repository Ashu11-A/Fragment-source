import { fragmentSocketContract } from 'socket'
import { z } from 'zod'

export type PluginResult = z.infer<typeof fragmentSocketContract.clientToServer['core:plugin:result']>
export type PluginEntry = NonNullable<PluginResult['plugins']>[number]
