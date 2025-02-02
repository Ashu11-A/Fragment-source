 
import { strategies } from '@/strategies/index.js'
import chalk from 'chalk'
import { FastifyReply, FastifyRequest } from 'fastify'
import { glob } from 'glob'
import { basename, dirname, extname, join } from 'path'
import { ZodObject, ZodRawShape } from 'zod'
import { MethodType, ReplyKeysToCodes, ReplyType, ResolveReplyType, RouteHandler, type RouterOptions } from '../types/router.js'
import { Fastify, fastifyPassport } from './fastify.js'

/**
 * Our Router class.  
 * We add an index signature so that the compiler knows that extra properties (like 'get')
 * may be present.
 */
export class Router<
  Schema extends ZodRawShape,
  Methods extends Partial<Record<MethodType, RouteHandler<Schema>>>
> {
  static all: Router<ZodRawShape, Partial<Record<MethodType, RouteHandler<ZodRawShape>>>>[] = []

  public name: string
  public path?: string
  public schema?: ZodObject<Schema>
  public description: string
  public authenticate
  public methods: Methods

  constructor(options: RouterOptions<Schema, Methods>) {
    const { name, path, schema, description, authenticate, delete: deleteHandle, get, post, put, websocket } = options
    this.name = name
    this.path = path
    this.schema = schema
    this.description = description
    this.authenticate = authenticate
    this.methods = {
      delete: deleteHandle,
      get,
      post,
      put,
      websocket
    };

    (Router.all as unknown as Router<Schema, Methods>[]).push(this)
  }

  static async register () {
    const pathRouter = join(import.meta.dirname, '../../routers')
    const routers = await glob('**/*.ts', { cwd: pathRouter })

    for (const file of routers) {
      const filePath = join(pathRouter, file)
      const { default: router } = await import(filePath) as { default: Router<ZodRawShape, object> }
      if (router === undefined) {
        console.log(chalk.red(`Put export default in the route: ${filePath}`))
        continue
      }
      
      router.path = router?.path ?? file
    }

    for (const [index, router] of Object.entries(Router.all)) {
      let path = router.path as string

      // <-- Formata o PATH
      const regexBrackets = /\(([^)]+)\)/g

      // Remove o nome do arquivo da rota
      if (['.ts', '.js'].includes(extname(path))) {
        path = join(dirname(path), basename(path, extname(path)))
      }
      
      // Caso a rota seja do tipo index, deixe ele com o nome da rota da pasta
      if (path.includes('index')) {
        path = path.replace(basename(path), '')
      }

      // Caso a rota tenha algum diretório entre () parênteses, eles serão removidos do path
      if (regexBrackets.test(path)) {
        path = path.replace(regexBrackets, '')
      }
      // Remove caracter com final com '/' ou '\'
      path = path.replace(/[/\\]$/, '')
      // Adiciona / no começo do path caso necessario
      path = join('/', path)
      // Substitui '\'' para '/'
      path = path.replace(/\\/g, '/')

      Router.all[Number(index)].path = path
      
      for (const [type, method] of Object.entries(router.methods)) {
        if (!Object.keys(MethodType).includes(type) || typeof method !== 'function') continue
        const auth = router.authenticate ? { preValidation: fastifyPassport.authenticate(strategies.map((strategy) => strategy.name)) } : {}
        const response = (request: FastifyRequest, reply: FastifyReply) => {
          const parsed = router.schema?.safeParse(request.body)

          if (parsed !== undefined && !parsed.success) return reply.code(400).send({
            message: parsed.error.name,
            error: parsed.error
          })

          return method(
            request,
            (reply as ReplyType<ReplyKeysToCodes<unknown>, ResolveReplyType<unknown, ReplyKeysToCodes<unknown>>>),
            parsed?.data ?? {}
          )
        }

        switch(type) {
        case MethodType.get: {
          Fastify.server.get(path, auth, response)
          break
        }
        case MethodType.post: {
          Fastify.server.post(path, auth, response)
          break
        }
        case MethodType.put: {
          Fastify.server.put(path, auth, response)
          break
        }
        case MethodType.delete: {
          Fastify.server.delete(path, auth, response)
          break
        }
        case MethodType.websocket: {
          Fastify.server.get(path, { websocket: true, ...auth }, () => {})
        }
        }
      }

      console.log(chalk.green(`
📡 The route ${chalk.blueBright(path)} has been successfully registered!
    🏷️  Route Name: ${chalk.cyan(router.name)}
    📃 Description: ${chalk.yellow(router.description)}
    📋 Methods: ${chalk.magenta(Object.keys(router).filter((type) => Object.keys(MethodType).includes(type)).join(', '))}
      `))
      
    }
  }
}