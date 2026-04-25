import { fastifyCompress } from '@fastify/compress'
import fastifyCookie from '@fastify/cookie'
import fastifyCors from '@fastify/cors'
import { fastifyMultipart } from '@fastify/multipart'
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify'
import fastify, { type FastifyInstance } from 'fastify'
import fastifyIO from 'fastify-socket.io'
import { constants as zlibConstants } from 'zlib'

import { appRouter } from '@/routers/index.js'
import discordAuthRoutes from '@/routes/discordAuth.js'
import { BearerStrategy } from '@/strategies/BearerStrategy.js'
import { CookiesStrategy } from '@/strategies/CookiesStrategy.js'
import { createContext } from '@/trpc/createContext.js'
import { setupSocketController } from './socket.js'
import { createAdapter } from '@socket.io/cluster-adapter'
import cluster from 'cluster'

interface Options {
  host: string
  port: number
  log?: boolean
}

export class Fastify {
  static server: FastifyInstance
  constructor(public options: Options){}

  config () {
    const cookieToken = process.env['COOKIE_TOKEN']
    if (cookieToken === undefined) throw new Error('Cookie token are undefined')

    Fastify.server = fastify({
      logger: {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname,reqId',
          },
        },
      },
      // Required for tRPC batch requests — default maxParamLength: 100 would cause 404s
      routerOptions: { maxParamLength: 5000 },
    })
      .addHook('onRoute', (routeOptions) => {
        Fastify.server.log.debug(`[route] ${routeOptions.method} ${routeOptions.url}`)
      })
      .register(fastifyCors, {
        origin: process.env.FRONT_END_URL
      })
      .register(fastifyCompress, {
        logLevel: 'debug',
        brotliOptions: {
          params: {
            [zlibConstants.BROTLI_PARAM_MODE]: zlibConstants.BROTLI_MODE_TEXT,
            [zlibConstants.BROTLI_PARAM_QUALITY]: 11
          }
        },
        zlibOptions: {
          level: 9,
        }
      })
      .register(fastifyMultipart, {
        limits: {
          fileSize: 1024 * 1024 * 50 // 50 Mb
        },
      })
      .register(fastifyCookie, {
        secret: cookieToken,
      })
      .register(fastifyIO, {
        // WebSocket-only in production: each connection is a single persistent TCP
        // socket, so round-robin workers never split the same session across processes.
        // HTTP long-polling would require sticky sessions (not set up here).
        transports: process.env.PRODUCTION === 'true' ? ['websocket'] : ['polling', 'websocket'],
        cors: {
          origin: '*',
          methods: ['GET', 'POST', 'OPTIONS'],
        }
      })
      .decorate('auth', {
        strategies: [
          BearerStrategy,
          CookiesStrategy
        ]
      })
      .register(fastifyTRPCPlugin, {
        prefix: '/trpc',
        trpcOptions: { router: appRouter, createContext },
      })
      .register(discordAuthRoutes)

    return this
  }

  async listen () {
    if (Fastify.server == undefined) throw new Error('Server not configured!')

    await new Promise<void>((resolve) => {
      Fastify.server.listen({
        port: this.options.port,
        host: this.options.host
      }, (err) => {
        if (err === null) {
          if (process.env.PRODUCTION && cluster.isWorker) {
            Fastify.server.io.adapter(createAdapter())
            Fastify.server.log.info(`Worker ${process.pid} ready`)
          }
          
          setupSocketController(Fastify.server)
          
          Fastify.server.io.on('connection', (socket) => {
            Fastify.server.log.info(`[socket] connected ${socket.id}`)
            socket.on('disconnect', (reason) => {
              Fastify.server.log.info(`[socket] disconnected ${socket.id} (${reason})`)
            })
          })
          return resolve()
        }
        Fastify.server.log.warn(`Port ${this.options.port} unavailable, trying ${this.options.port + 1}`)
        this.options.port = this.options.port + 1
        return this.listen()
      })
    }) 
  }
}