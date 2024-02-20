import { core, db } from '@/app'
import { numerosParaLetras, updateProgressAndEstimation } from '@/functions'
import { type PaymentServerCTRL, type PaymentUserCTRL, type UserData } from '@/interfaces'
import axios, { type AxiosError, type AxiosInstance } from 'axios'

export class CtrlPanel {
  private readonly url
  private readonly token

  constructor ({ url, token }: {
    url: string
    token: string
  }) {
    this.url = url
    this.token = token
  }

  private client (): AxiosInstance {
    return axios.create({
      baseURL: `${this.url}/api`,
      maxRedirects: 5,
      headers: {
        Authorization: `Bearer ${this.token}`
      }
    })
  }

  /**
   * Create User
   */
  public async createUser (options: {
    data: {
      name: string
      email: string
      password: string
    }
  }): Promise<UserData | AxiosError<any, any> | undefined> {
    try {
      const { data } = options
      return await this.client().post('/users', data)
        .then((res: { data: UserData }) => { return res.data })
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
    const usersData: PaymentUserCTRL[] = []
    const serversData: PaymentServerCTRL[] = []
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
        const users = data.data

        for (const user of users) {
          const { id, name, email, pterodactyl_id: pterodactylId, role } = user
          usersData.push({
            id,
            name,
            email,
            pterodactylId,
            role
          })
          if (user.role === 'client') {
            clientCount++
          }
          if (user.role === 'admin') {
            teamCount++
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
          const { user_id: userId, suspended, created_at: createAt, name, identifier, pterodactyl_id: pterodactylId } = server
          serversData.push({
            userId,
            pterodactylId,
            name,
            identifier,
            suspended,
            createAt
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
      return await fetchUsers(`${url}/api/users?page=1`)
    } else if (type === 'servers') {
      return await fetchServers(`${url}/api/servers?page=1`)
    }
  }
}
