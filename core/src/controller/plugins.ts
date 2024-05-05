import { execFile, spawnSync } from 'child_process'
import { glob } from 'glob'
import { basename, join } from 'path'
import { cwd } from 'process'
import { createServer } from 'net'
import { randomInt } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import { existsSync } from 'fs'

interface PluginsOptions {
    directory?: string
}

interface Plugin {
    name: string
    commands: string[]
    events: string[]
    components: string[]
    crons: string[]
    signature: string
    date: string
    size: string
}

export class ControllerPlugins {
    private readonly options: PluginsOptions
    private readonly path
    private plugins: Record<string, Plugin> = {}

    constructor(options: PluginsOptions) {
        this.options = options
        this.path = join(cwd(), (options?.directory ?? 'plugins'))
    }

    async getInfo (filePath: string): Promise<Plugin | undefined> {
        return new Promise((resolve, reject) => {
            execFile(filePath, ['--info'], (err, stdout, stderr) => {
                if (err !== null || stderr !== '') reject(err ?? stderr)
                resolve(JSON.parse(stdout) as Plugin)
            })
        })
    }

    async search (): Promise<Record<string, Plugin>> {
        const files = await glob(this.path)
        let plugins = {}

        for (const file of files) {
            const plugin = await this.getInfo(file)
            plugins = {
                ...plugins,
                plugin
            }
        }
        this.plugins = plugins
        return plugins
    }

    async start (): Promise<void> {
        if (Object.keys(this.plugins).length === 0) throw new Error('Nenhum plugin carregado!')

        const processSpawn = []
        for (const [filePath, plugin] of Object.entries(this.plugins)) {
            const port = this.generatePort()
            const fileName = basename(filePath)
            const process = spawnSync(`${filePath} --port ${port}`)
            processSpawn.push({ plugin: fileName, pid: process.pid, port })
        }
        if (!existsSync(this.path)) await mkdir(this.path)
        await writeFile(`${this.path}/process.json`, JSON.stringify(processSpawn, null, 2), { encoding: 'utf-8' })
    }

    async generatePort (): Promise<number> {
        let port = 0

        async function findPort() {
            port = randomInt(65535)
            const result = await new Promise<boolean>((resolve) => {
                const server = createServer()

                server.once('error', (err) => {
                    console.log(err)
                    resolve(false)
                })

                server.once('listening', () => {
                    server.close()
                    resolve(true)
                })

                server.listen(port, 'localhost')
            })
            console.log(port)
            if (result === false) return await findPort()
            return port
        }
        return await findPort()
    }
}

const Plugins = new ControllerPlugins({ directory: 'plugins' })
async function start () {
    Plugins.search()
    Plugins.start()
}

void start()
