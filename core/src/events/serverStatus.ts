import { ClientEvent } from 'socket'

export const serverStatus = new ClientEvent({
  name: 'server:status',
  onRun({ data }) {
    console.log(`[core:socket] Server is ${data.status} with ${data.connectedClients} clients`)
  },
})
