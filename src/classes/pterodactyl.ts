import { core } from '@/app'
import { type EggObject, type NestObject, type NodeConfigObject, type NodeObject, type Server, type UserObject } from '@/interfaces'
import axios, { type AxiosError, type AxiosInstance } from 'axios'

export class Pterodactyl {
  private readonly url
  private readonly token
  private readonly tokenUser
  constructor (options: {
    url: string
    token: string
    tokenUser?: string
  }) {
    this.url = options.url
    this.token = options.token
    this.tokenUser = options.tokenUser
  }

  /**
    * @return PendingRequest
    */
  private client (): AxiosInstance {
    const { token, url } = this
    return axios.create({
      baseURL: `${url}/api`,
      maxRedirects: 5,
      headers: {
        Accept: 'Application/vnd.pterodactyl.v1+json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    })
  }

  /**
    * @return PendingRequest
    */
  private clientAdmin (): AxiosInstance {
    const { url, tokenUser } = this
    return axios.create({
      baseURL: `${url}/api`,
      method: 'POST',
      maxRedirects: 5,
      headers: {
        Accept: 'Application/vnd.pterodactyl.v1+json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenUser}`
      }
    })
  }

  private showLog (): void {
    core.info(`Requicição para ${this.url}`)
  }

  public async getNests (): Promise<NestObject[] | undefined> {
    try {
      return await this.client().get('application/nests?per_page=999')
        .then(async (res) => {
          if (res.status === 200) {
            return res.data.data as NestObject[]
          }
        })
    } catch (err) {
      console.log(err)
    }
  }

  public async getEggs (nestId: string | number): Promise<EggObject[] | undefined> {
    try {
      return await this.client().get(`application/nests/${nestId}/eggs`)
        .then(async (res) => {
          return res.data.data as EggObject[]
        })
    } catch (err) {
      console.log(err)
    }
  }

  /**
   * Obter detalhes de um egg expecifico
   * Metodo: GET
   */
  public async getEgg (options: {
    nest: number | string
    egg: number | string
  }): Promise<EggObject | AxiosError<any, any> | undefined> {
    const { egg, nest } = options
    try {
      return await this.client().get(`application/nests/${nest}/eggs/${egg}`)
        .then((res) => {
          return res.data as EggObject
        })
    } catch (err) {
      console.log(err)
      if (axios.isAxiosError(err)) {
        return err
      }
    }
  }

  public async user (options: {
    userId?: string | number
    data?: {
      email: string
      username: string
      first_name: string
      last_name: string
      password?: string
    }
    type: 'create' | 'update' | 'delete' | 'list'
  }): Promise<UserObject | number | undefined | AxiosError<any, any>> {
    try {
      const { type, data, userId } = options

      switch (type) {
        case 'list':
          return await this.client().get('application/users')
            .then((res) => res.data as UserObject)
        case 'create':
          return await this.client().post('application/users', data)
            .then(async (res) => {
              return res.data as UserObject
            })
        case 'update':
          return await this.client().patch(`application/users/${userId}`, data)
            .then(async (res) => {
              return res.data as UserObject
            })
        case 'delete':
          return await this.client().delete(`application/users/${userId}`)
            .then(async (res) => {
              return res.status
            })
      }
    } catch (err: any | Error | AxiosError) {
      console.log(err)
      if (axios.isAxiosError(err)) {
        return err
      }
    }
  }

  public async getNodes (): Promise<NodeObject[] | undefined | AxiosError<any, any>> {
    try {
      return await this.client().get('application/nodes?include=servers,location,allocations')
        .then(async (res) => {
          return res.data.data as NodeObject[]
        })
    } catch (err) {
      console.log(err)
      if (axios.isAxiosError(err)) {
        return err
      }
    }
  }

  public async getConfigNode (options: {
    id: string | number
  }): Promise<NodeConfigObject | AxiosError<any, any> | undefined> {
    try {
      return await this.client().get(`application/nodes/${options.id}/configuration`)
        .then(async (res) => {
          return res.data as NodeConfigObject
        })
    } catch (err) {
      console.log(err)
      if (axios.isAxiosError(err)) {
        return err
      }
    }
  }

  /**
   * Solicitação para a criação de servidores Pterodactyl
   * Metodo: Post
   */
  public async createServer (options: {
    name: string
    user: number
    egg: number
    docker_image: string
    startup: string
    environment: {
      BUNGEE_VERSION: string
      SERVER_JARFILE: string
      limits: {
        memory: number
        swap: 0
        disk: number
        io: 500
        cpu: number
      }
      feature_limits: {
        databases: 0
        backups: 0
      }
      allocation: {
        default: number
      }
    }
  }): Promise<Server | AxiosError<any, any> | undefined> {
    try {
      return await this.client().post('application/servers', options)
        .then(async (res) => {
          return res.data as Server
        })
    } catch (err) {
      console.log(err)
      if (axios.isAxiosError(err)) {
        return err
      }
    }
  }
}
