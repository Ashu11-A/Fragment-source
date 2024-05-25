import { Blowfish, enc } from 'crypto-js'
import { readFile, rm, writeFile } from 'fs/promises'
import { RootPATH } from '..'
import { api, key } from '../../package.json'
import { CronJob } from 'cron'
import prompts, { Choice, PromptObject } from 'prompts'

interface DataKey {
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
    private localData: DataKey | undefined

    async init() {
        this.localData = await decrypt()
    }

    async login(): Promise<AuthData | undefined> {
        const response = await fetch(`${api}/auth/login`, {
            method: 'POST',
            body: JSON.stringify({ email: this.localData?.email, password: this.localData?.password }),
            headers: {
                "Content-Type": "application/json",
            }
        })
    
        if (!response.ok) {
            prompts.override(((await import('yargs')).argv))

            const choices: Choice[] = [
                { title: 'Deslogar', description: 'Removerá seção atual', value: 'deslogar' },
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
                case 'deslogar': {
                    await rm(`${RootPATH}/.key`)
                    process.exit()
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

    async validator() {
        const response = await fetch(`${api}/bots/${this.localData?.token}`, {
            headers: {
                Authorization: `Bearer ${Auth.accessToken.token}`
            }
        })

        if (!response.ok) throw new Error(`☝️ Então ${Auth.user.name}, não achei o registro do seu bot!`)

        const data = await response.json() as BotInfo

        if (data.expired) {
            console.log('❌ Bot expirou!')
        } else if (!data.enabled) {
            console.log('❌ Bot desabilitado!')
        }

        Auth.bot = data
    }

    async cron () {
        CronJob.from({
            cronTime: '* * * * *',
            onTick: () => this.validator(),
            start: true
        })
    }
}

export async function encrypt(content: string) {
    await writeFile(`${RootPATH}/.key`, Blowfish.encrypt(content, key).toString())
}

export async function decrypt(): Promise<DataKey> {
    const content = Blowfish.decrypt(await readFile(`${RootPATH}/.key`, { encoding: 'utf-8' }), key).toString(enc.Utf8)
    return JSON.parse(content)
}