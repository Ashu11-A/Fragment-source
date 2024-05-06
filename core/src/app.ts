import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { argv } from 'process'
import { env, PKG_MODE } from '.'
import { Plugins } from './controller/plugins'
import { SocketController } from './controller/socket'
import { register } from './discord/register'
import { generatePort } from './functions/port'

interface Args {
    command: string,
    alias: string[]
}

const args = argv.splice(2).map((arg) => arg.replace('--', '').replace('-', ''))
const argsList: Array<Args> = [
    { command: 'info', alias: ['i'] },
    { command: 'port', alias: ['p'] }
]

async function app() {
    if (env?.BOT_TOKEN === undefined || env?.BOT_TOKEN === 'Troque-me') {
        await writeFile(join(process.cwd(), '.env'), 'BOT_TOKEN=Troque-me', { encoding: 'utf-8' })
        throw new Error('Defina um token!')
    }

    const port = PKG_MODE ? String(await generatePort()) : '3000'
    const socket = new SocketController()
    const plugins = new Plugins({ directory: 'plugins' })

    if (PKG_MODE) await plugins.load(port)
    await register()
    socket.ready()

    if (args.length === 0) socket.listen(port)
    for (let argNum = 0; argNum < args.length; argNum++) {
        for (const { alias, command } of argsList) {
            if (alias.includes(args[argNum]) ) args[argNum] = command
        }

        switch (args[argNum]) {
            case 'info': {
                const manifest = JSON.parse(await readFile(join(__dirname, '../package.json'), { encoding: 'utf-8' }))
                console.info(manifest)
                break
            }
            case 'port': {
                argNum++
                socket.listen(args[argNum])
                break
            }
        }
    }
}

void app()