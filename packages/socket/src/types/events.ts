import { serverToClientEvents, clientToServerEvents } from '../events.js'

export type FragmentServerToClient = typeof serverToClientEvents
export type FragmentClientToServer = typeof clientToServerEvents
