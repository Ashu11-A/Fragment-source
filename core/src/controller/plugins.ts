import { delay } from '@/functions/delay'
import { spawn } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { mkdir } from 'fs/promises'
import { glob } from 'glob'
import { join } from 'path'
import { cwd } from 'process'

interface PluginsOptions {
    directory?: string,
    port?: string
}

interface Plugin {
    name: string
    version: string,
    author: string
    signature: string
    date: Date
    size: string
    commands: string[]
    events: string[]
    components: string[]
    crons: string[]
}

export class Plugins {
    private readonly options: PluginsOptions
    private readonly path
    public static plugins = 0
    public static loaded = 0

    constructor(options: PluginsOptions) {
        if (!existsSync((cwd(), options.directory ?? 'plugins'))) mkdir((cwd(), options.directory ?? 'plugins'))
        this.path = join(cwd(), options?.directory ?? 'plugins')
        this.options = options
    }

    async list () {
        const plugins = await glob(`${this.path}/*`)
        let valid = []
        for (const filePath of plugins) {
            if (!isBinaryFile(filePath)) continue
            valid.push(filePath)
        }
        Plugins.plugins = valid.length
        return valid
    }

    async load (port: string): Promise<void> {
        const plugins = await this.list()
        if (plugins.length === 0) {
            console.log('Nenhum plugin carregado!')
            return
        }

        for (const filePath of plugins) {
            await new Promise ((resolve, reject) => {
                const child = spawn(filePath, ['--port', port])

                child.on('error', (err) => reject(err))
                child.on('exit', (code, signal) => {
                    if (code === 0) resolve(null)
                    Plugins.plugins = Plugins.plugins - 1
                    reject(`O binário ${filePath} saiu com código de erro ${code} e sinal ${signal}`)
                })
                child.stdout.once('data', (message) => {
                    resolve(message)
                })
            })
        }
    }
}

function isBinaryFile(filePath: string) {
    const buffer = readFileSync(filePath);
    const length = buffer.length;
    for (let i = 0; i < length; i++) {
        if (buffer[i] < 32 && buffer[i] !== 9 && buffer[i] !== 10 && buffer[i] !== 13) {
            console.log('Binario valido!')
            return true; // Caractere não imprimível encontrado, provavelmente um arquivo binário
        }
    }
    return false;
}
