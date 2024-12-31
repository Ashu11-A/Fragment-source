export * from './controllers/Manager'
export * from './controllers/Watcher'
export * from './controllers/Version'
export * from './controllers/Plugin'
export * from './controllers/Websocket'
export * from './types/manager'

import { PKG_MODE } from '.'
import { generatePort } from 'utils'

export const socketPort = PKG_MODE ? await generatePort() : 3000