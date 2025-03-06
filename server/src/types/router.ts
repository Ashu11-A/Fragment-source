import { Role, User } from '@/database/entity/User.js'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { z, ZodError, ZodTypeAny } from 'zod'

/*
 * Enum for HTTP method types.
 */
export enum MethodType {
  get = 'get',
  post = 'post',
  put = 'put',
  delete = 'delete',
  socket = 'socket'
}

export type TErrorResponse = { message: string; toast?: string }
export type TReplySuccess<TData> = { message: string; data: TData }
export type ListResponse<TData> = {
  data: TData[]
  total: number
  currentPage: number
  totalPages: number
  pageSize: number
}
export type TReplyError = {
  [Status in 401 | 403 | 404 | 409 | 422 | 500]: TErrorResponse
}

export type TReply<TData> = {
  200: TReplySuccess<TData>
  201: TReplySuccess<TData>
  202: ListResponse<TData>
  302: {
    url: string
    message: string
    shouldRedirect?: boolean
  }
  400: TErrorResponse & { error: ZodError }
} & TReplyError

export type ZodInferredData<
  Method extends MethodKeys,
  Schema extends SchemaDynamic<Method>,
> = Schema[Method] extends z.ZodTypeAny
  ? z.infer<Schema[Method]>
  : unknown
export type MethodKeys = keyof typeof MethodType
export type SchemaDynamic<M extends MethodKeys> = { [K in M]?: ZodTypeAny }
export type ReplyKeys = keyof TReply<unknown>
export type ResolveReply<TData, Code extends ReplyKeys> =
  Code extends keyof TReply<TData> ? TReply<TData>[Code] : never

export type TypedReply<TData, Code extends ReplyKeys> = 
  Omit<FastifyReply, 'code'|'status'|'send'> & {
    code<C extends ReplyKeys>(statusCode: C): TypedReply<TData, C>
    status<C extends ReplyKeys>(statusCode: C): TypedReply<TData, C>
    send<D>(payload?: ResolveReply<D, Code>): TypedReply<{ [C in Code]: ResolveReply<D, Code> }, Code>
  }

export interface CustomInstanceFastify extends FastifyRequest {
  user: User
}

export type RouteHandler<
  Method extends MethodKeys,
  Authenticate extends boolean | Role | Role[],
  Schema extends SchemaDynamic<Method>,
> = <TData> (args: {
  request: Authenticate extends true | Role | Role[] ? CustomInstanceFastify : Omit<CustomInstanceFastify, 'user'>
  reply: TypedReply<TData, ReplyKeys>;
  schema: ZodInferredData<Method, Schema>;
}) => TypedReply<TData, ReplyKeys> | Promise<TypedReply<TData, ReplyKeys>>

export type RouterOptions<
  Authenticate extends boolean | Role | Role[],
  Schema extends SchemaDynamic<Methods>,
  Routers extends { [Method in Methods]?: RouteHandler<Method, Authenticate, Schema> },
  Methods extends MethodKeys = MethodKeys,
> = {
  name: string
  path?: string
  authenticate?: Authenticate
  schema?: Schema
  description: string
  methods: Routers
}