import { fastifyCookie } from '@fastify/cookie'
import { fastifyMultipart } from '@fastify/multipart'
import { fastifyWebsocket } from '@fastify/websocket'
import fastify, { FastifyInstance } from 'fastify'

import { BearerStrategy } from '@/strategies/BearerStrategy.js'
import { CookiesStrategy } from '@/strategies/CookiesStrategy.js'

interface Options {
  host: string
  port: number
  log?: boolean
}

export class Fastify {
  static server: FastifyInstance
  constructor(public options: Options){}

  init () {
    const server = fastify({
      logger: this.options.log === undefined ? undefined : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard', // Formato de data e hora
            ignore: 'pid,hostname,reqId', // Ignorar campos desnecessários
          },
        },
      },
    })
    
    const cookieToken = process.env['COOKIE_TOKEN']
    if (cookieToken === undefined) throw new Error('Cookie token are undefined')

    server
      .register(fastifyMultipart, {
        limits: {
          fileSize: 1024 * 1024 * 50 // 50 Mb
        }
      })
      .register(fastifyWebsocket)
      .register(fastifyCookie, {
        secret: cookieToken,
      })
      .decorate('auth', {
        strategies: [
          BearerStrategy,
          CookiesStrategy
        ]
      })

    Fastify.server = server
    return this
  }

  listen () {
    Fastify.server.listen({
      port: this.options.port,
      host: this.options.host
    }, (err, address) => {
      if (err !== null) {
        console.log(`Port unavailable: ${this.options.port}`)
        console.log(err)
        this.options.port = this.options.port + 1
        return this.listen()
      }
          
      console.log(`Server listening at ${address}`)
    })
  }
}