import express, { Application } from 'express';
import { createServer } from "http";
import { Server } from "socket.io";
import { Event } from "./events";

export class SocketController {
    protected readonly app: Application
    public server
    public io: Server

    constructor() {
        this.app = express()
        this.server = createServer(this.app)
        this.io = new Server(this.server, { path: '/socket.io' })
    }

    listen (port: string) {
        this.server.listen(port, () => {
            console.log(`Servidor inicializado na porta ${port}`)
        })
    }

    ready() {
        this.io.on('connection', async (client) => {
            const event = new Event({ client })
            event.connected()
            event.controller() 
        })
    }
}