import { Blowfish, enc } from 'crypto-js'
import { readFile, rm, writeFile } from 'fs/promises'
import { RootPATH } from '..'
import { api, key } from '../../package.json'
import { CronJob } from 'cron'
import prompts, { Choice, PromptObject } from 'prompts'
import { existsSync } from 'fs'

type Credentials = {
    email: string
    password: string
    token: string
}

interface User {
    name: string;
    email: string;
    uuid: string;
}

interface AccessToken {
    token: string;
    expireIn: number;
}

interface RefreshToken {
    token: string;
    expireIn: number;
}

interface AuthData {
    user: User;
    accessToken: AccessToken;
    refreshToken: RefreshToken;
}
interface BotInfo {
    uuid: string;
    name: string;
    enabled: boolean;
    expired: boolean;
    expire_at: string;
    created_at: string;
}

export class Auth {
  public static user: User
  public static accessToken: AccessToken
  public static bot: BotInfo | undefined
  private credentials: Credentials | undefined
    
  async askCredentials ({ question }: { question?: (keyof Credentials)[]  }): Promise<Credentials> {
    const questions: PromptObject<string>[] = [
      { name: 'email', message: 'Email', type: 'text', warn: 'Apenas cadastrado em paymentbot.com' },
      { name: 'password', message: 'Senha', type: 'password', warn: 'Apenas cadastrado em paymentbot.com' },
      { name: 'token', message: 'Token', type: 'password', warn: 'Visível no Dashboard' }
    ]

    const filter = questions.filter((propmt) => question === undefined || question?.includes(propmt.name as keyof Credentials))
    const response = await prompts(filter) as Credentials
    
    if (Object.keys(response).length !== filter.length || Object.entries(response).filter(([, content]) => content === '').length > 0) throw new Error('Formulário não respondido!')
    await this.encryptCredentials(response)
    return response
  }

  async encryptCredentials(credentials: Credentials): Promise<void> {
    credentials = {
      ...(await this.decryptCredentials()),
      ...credentials
    }

    await writeFile(`${RootPATH}/.key`, Blowfish.encrypt(JSON.stringify(credentials), key).toString())
  }

  async decryptCredentials(): Promise<Credentials> {
    const encrypted = existsSync(`${RootPATH}/.key`) ? Blowfish.decrypt(await readFile(`${RootPATH}/.key`, { encoding: 'utf-8' }), key).toString(enc.Utf8) : '{}'
    return JSON.parse(encrypted)
  }


  async initialize() {
    const credentials = await this.decryptCredentials()
    const keys = ['email', 'password', 'token']
    let hasError = false

    for (const key of keys) {
      const credential = credentials[key as keyof Credentials]
      if (credential === undefined || credential === '') hasError = true
    }
    if (hasError) {
      await this.askCredentials({})
      await this.initialize()
      return
    }
    this.credentials = credentials
  }

  async login(): Promise<AuthData | undefined> {
    if (this.credentials === undefined) {
      await this.initialize()
    }

    const response = await fetch(`${api}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: this.credentials?.email, password: this.credentials?.password }),
      headers: {
        "Content-Type": "application/json",
      }
    })
    
    if (!response.ok) {
      const choices: Choice[] = [
        { title: 'Deslogar', description: 'Removerá seção atual', value: 'logout' },
        { title: 'Tentar Novamente', description: 'Tentar novamente fazer o login', value: 'try_again' }
      ]

      const conclusion = await prompts({
        type: 'select',
        name: 'Error',
        message: `Erro ${response.statusText} ao tentar logar!`,
        choices,
        initial: 1
      })

      switch (conclusion.Error) {
      case 'logout': {
        await this.logout()
        await this.askCredentials({})
        await this.initialize()
        await this.login()
      }
      case 'try_again': {
        await this.login()
      }
      }
      return
    }
    const data = await response.json() as AuthData

    Auth.user = data.user
    Auth.accessToken = data.accessToken
    
    console.log(`\n👋 Olá ${data.user.name}\n`)
    return data
  }


  async logout () {
    await rm(`${RootPATH}/.key`)
  }

  async validator() {
    if (this.credentials === undefined) {
      await this.initialize()
    }
        
    const response = await fetch(`${api}/bots/${this.credentials?.token}`, {
      headers: {
        Authorization: `Bearer ${Auth.accessToken.token}`
      }
    }).catch((err) => {
      console.log(`🔴 API instável!`)
      return err
    })

    if (!response.ok) {
      console.log(`☝️ Então ${Auth.user.name}, não achei o registro do seu bot!`)
      const choices: Choice[] = [
        { title: 'Mudar Token', value: 'change' },
        { title: 'Tentar Novamente', value: 'try_again' },
        { title: 'Deslogar', value: 'logout' }
      ]

      const conclusion = await prompts({
        name: 'Error',
        type: 'select',
        choices,
        message: `Ocorreu um erro ${response.statusText}`,
        initial: 1
      })

      switch (conclusion.Error) {
      case 'change': {
        await this.askCredentials({ question: ['token'] })
        await this.initialize()
        await this.login()
        await this.validator()
        break
      }
      case 'try_again': {
        await this.validator()
        break
      }
      case 'logout': {
        await this.logout()
        await this.askCredentials({})
        await this.initialize()
        await this.login()
        await this.validator()
        break
      }
      }

      return
    }

    const data = await response.json() as BotInfo

    if (data.expired) {
      console.log('❌ Bot expirou!')
    } else if (!data.enabled) {
      console.log('❌ Bot desabilitado!')
    }

    if (Auth.bot === undefined) this.startCron()

    Auth.bot = data
  }

  startCron (): void {
    const job = new CronJob('* * * * *', () => this.validator())
    job.start()
  }
}