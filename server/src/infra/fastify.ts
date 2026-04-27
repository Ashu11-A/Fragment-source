import { fastifyCompress } from '@fastify/compress'
import fastifyCookie from '@fastify/cookie'
import fastifyCors from '@fastify/cors'
import { fastifyMultipart } from '@fastify/multipart'
import fastifyRateLimit from '@fastify/rate-limit'
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify'
import fastify, { type FastifyInstance, type FastifyRequest } from 'fastify'
import fastifyIO from 'fastify-socket.io'
import { constants as zlibConstants } from 'zlib'

import { appRouter } from '../../routes/index.js'
import discordAuthRoutes from '../../routes/fastify/discordAuth.js'
import { BearerStrategy } from '@/security/strategies/BearerStrategy.js'
import { CookiesStrategy } from '@/security/strategies/CookiesStrategy.js'
import { createContext } from '@/createContext.js'
import { setupSocketController } from '@/infra/socket.js'
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

  config() {
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
          fileSize: 1024 * 1024 * 50
        },
      })
      .register(fastifyCookie, {
        secret: cookieToken,
      })
      .register(fastifyRateLimit, {
        global: true,
        // Rotas de autenticação têm limite estrito para mitigar brute-force.
        max: (request: FastifyRequest) => {
          const url = request.url ?? ''
          if (url.startsWith('/trpc/auth.') || url.startsWith('/auth/discord/')) return 15
          return 200
        },
        timeWindow: '1 minute',
        errorResponseBuilder: () => ({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Try again later.',
        }),
      })
      .register(fastifyIO as unknown as import('fastify').FastifyPluginCallback<Record<string, unknown>>, {
        // WebSocket-only em produção: cada conexão é um TCP persistente,
        // garantindo que workers round-robin não dividam a mesma sessão.
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

  async listen() {
    if (Fastify.server == undefined) throw new Error('Server not configured!')

    await new Promise<void>((resolve) => {
      Fastify.server.listen({
        port: this.options.port,
        host: this.options.host
      }, (err) => {
        if (err === null) {
          if (process.env.PRODUCTION === 'true' && cluster.isWorker) {
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
