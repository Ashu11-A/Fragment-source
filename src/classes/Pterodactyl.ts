import { core, db } from '@/app'
import { numerosParaLetras, updateProgressAndEstimation } from '@/functions'
import { type PaymentServerPtero, type PaymentUserPtero, type EggObject, type NestObject, type NodeConfigObject, type NodeObject, type Server, type UserObject } from '@/interfaces'
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

  /**
    * Pesquisar um E-mail específico
    */
  public async searchEmail (options: {
    email: string
    guildId: string
  }): Promise<{ status: boolean, userData: any[] | undefined }> {
    const { email, guildId } = options

    let metadata = await db.ctrlPanel.table(`${numerosParaLetras(guildId)}_users`).get('metadata')

    if (metadata?.lastPage === undefined) {
      metadata = await this.updateDatabase({ guildId, type: 'users' })
    }

    core.info(`Procurando: ${email}`)
    let foundUsers: any[] = []

    async function scan (): Promise<{
      status: boolean
      userData: any[] | undefined
    }> {
      let status: { status: boolean, userData: any[] | undefined } = { status: false, userData: undefined }
      for (let page = 1; page <= metadata.lastPage; page++) {
        const dataDB = await db.ctrlPanel.table(`${numerosParaLetras(guildId)}_users`).get(String(page))

        if (Array.isArray(dataDB)) {
          foundUsers = dataDB.filter(
            (user: { email: string }) => user.email.toLowerCase() === email.toLowerCase()
          )

          if (foundUsers.length > 0) {
            core.info(`Pesquisando: ${page}/${metadata.lastPage} | Encontrei`)
            status = { status: true, userData: foundUsers }
            break
          } else {
            core.info(`Pesquisando: ${page}/${metadata.lastPage} |`)
          }
        } else {
          core.error('dataDB não é um array iterável.')
          status = { status: false, userData: undefined }
          break
        }

        if (page === metadata.last_page) {
          status = { status: false, userData: undefined }
          break
        }
      }
      return status
    }
    return await scan()
  }

  private async updateDatabase (options: {
    guildId: string
    type: 'users' | 'servers'
  }): Promise<
    { lastPage: number, perPage: number, total: number } |
    undefined> {
    const { guildId, type } = options
    const { url, token } = this
    const usersData: PaymentUserPtero[] = []
    const serversData: PaymentServerPtero[] = []
    const startTime = Date.now()
    let clientCount = 0
    let teamCount = 0

    async function fetchUsers (urlAPI: string): Promise<{ lastPage: number, perPage: number, total: number } | undefined> {
      try {
        const response = await axios.get(urlAPI, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`
          }
        })

        const data = response.data
        const users = data.data as PaymentUserPtero[]

        for (const user of users) {
          const { id, name, email, root_admin } = user
          usersData.push({
            id,
            name,
            email,
            root_admin
          })
          if (user.root_admin) {
            teamCount++
          } else {
            clientCount++
          }
        }

        if (data.current_page <= data.last_page) {
          const dataBD = await db.ctrlPanel.table(`${numerosParaLetras(guildId)}_users`).get(String(data.current_page))
          if (dataBD?.length <= 50 || usersData?.length > 0) {
            let isDataChanged = false

            for (let i = 0; i < 50; i++) {
              if (usersData?.[i] !== undefined && i >= 0 && i < usersData.length) {
                if (
                  (dataBD?.[i] === undefined) ||
                    (JSON.stringify(usersData?.[i]) !== JSON.stringify(dataBD?.[i]))
                ) {
                  // Se houver diferenças, marque como dados alterados
                  isDataChanged = true
                  break
                }
              }
            }
            if (isDataChanged) {
              core.info(`Tabela: ${data.current_page}/${data.last_page} | Mesclando`)
              await db.ctrlPanel.table(`${numerosParaLetras(guildId)}_users`).set(`${data.current_page}`, usersData)
            } else {
              core.info(`Tabela: ${data.current_page}/${data.last_page} | Sincronizado`)
            }

            if (data.current_page % 2 === 0) {
              const { progress, estimatedTimeRemaining } = updateProgressAndEstimation({
                totalTables: data.last_page,
                currentTable: data.current_page,
                startTime
              })
              core.log(`Tabelas: ${data.current_page}/${data.last_page}`, `Users: ${data.from} - ${data.to} / ${data.total}`, `${progress.toFixed(2)}% | Tempo Restante: ${estimatedTimeRemaining.toFixed(2)}s`)
            }
          }

          if (data.current_page === data.last_page) {
            const { last_page: lastPage, per_page: perPage, total } = data
            const metadata = {
              lastPage,
              perPage,
              total,
              clientCount,
              teamCount
            }
            await db.ctrlPanel.table(`${numerosParaLetras(guildId)}_users`).set('metadata', metadata)
            return metadata
          } else if (data.next_page_url !== null) {
            usersData.length = 0
            return await fetchUsers(data.next_page_url)
          }
        }
      } catch (err) {
        console.log(err)
      }
    }

    async function fetchServers (urlAPI: string): Promise<{ lastPage: number, perPage: number, total: number } | undefined> {
      try {
        const response = await axios.get(urlAPI, {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`
          }
        })

        const data = response.data
        const servers = data.data

        for (const server of servers) {
          const { user: userId, suspended, created_at: createAt, name, identifier, id } = server
          serversData.push({
            userId,
            name,
            identifier,
            suspended,
            createAt,
            id
          })
        }

        if (data.current_page <= data.last_page) {
          const dataBD = await db.ctrlPanel.table(`${numerosParaLetras(guildId)}_servers`).get(String(data.current_page))
          if (dataBD?.length <= 50 || serversData?.length > 0) {
            let isDataChanged = false

            for (let i = 0; i < 50; i++) {
              if (serversData?.[i] !== undefined && i >= 0 && i < serversData.length) {
                if (
                  (dataBD?.[i] === undefined) ||
                    (JSON.stringify(serversData?.[i]) !== JSON.stringify(dataBD?.[i]))
                ) {
                  isDataChanged = true
                  break
                }
              }
            }
            if (isDataChanged) {
              core.info(`Tabela: ${data.current_page}/${data.last_page} | Mesclando`)
              await db.ctrlPanel.table(`${numerosParaLetras(guildId)}_servers`).set(`${data.current_page}`, serversData)
            } else {
              core.info(`Tabela: ${data.current_page}/${data.last_page} | Sincronizado`)
            }
          }

          if (data.current_page === data.last_page) {
            const { last_page: lastPage, per_page: perPage, total } = data
            const metadata = {
              lastPage,
              perPage,
              total,
              sincDate: Number(new Date())
            }
            console.log(metadata)
            await db.ctrlPanel.table(`${numerosParaLetras(guildId)}_servers`).set('metadata', metadata)
            return metadata
          } else if (data.next_page_url !== null) {
            serversData.length = 0
            return await fetchServers(data.next_page_url)
          }
        }
      } catch (err) {
        console.log(err)
      }
    }

    // Iniciar o processo sincronizar os dados externos com os atuais
    if (type === 'users') {
      return await fetchUsers(`${url}/api/application/users?page=1`)
    } else if (type === 'servers') {
      return await fetchServers(`${url}/api/application/servers?page=1`)
    }
  }
}
