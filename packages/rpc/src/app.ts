import type { AxiosRequestConfig, AxiosResponse } from 'axios'
import axios, { AxiosError } from 'axios'
import { type MethodType } from 'server'

type RouterBase = Record<string, { [Mehtod in MethodType]?: { response?: unknown, request?: unknown } }>

export class Client <Routers extends RouterBase> {
  constructor(private host: string) {}

  async query<
    Path extends keyof Routers,
    Method extends keyof Routers[Path],
    Router extends { response: unknown } = Extract<Routers[Path][Method], { response: unknown }>
  >(
    path: Path,
    method: Method,
    ...params: Routers[Path][Method] extends { request: infer Req } ? [Req] : []
  ): Promise<{ [Status in keyof Router['response']]: Router['response'][Status] }> {
    const url = `${this.host}${String(path)}`

    const config: AxiosRequestConfig = {
      url,
      method: String(method).toUpperCase(),
      params: method === 'get' ? Object.assign({}, ...params) : undefined,
      data: method !== 'get' ? Object.assign({}, ...params) : undefined
    }

    try {
      const response: AxiosResponse<Router['response']> = await axios(config)
      
      return { [response.status]: response.data } as { [Status in keyof Router['response']]: Router['response'][Status] }
    } catch (err: unknown) {
      if (err instanceof AxiosError && err.response) {
        return { [err.response.status]: err.response.data } as { [Status in keyof Router['response']]: Router['response'][Status] }
      }

      throw err
    }

  }
}