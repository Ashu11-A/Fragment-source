import { readFile } from 'fs/promises'
import { join } from 'path'
import { argv, env } from 'process'
import { PKG_MODE } from '.'
import { Plugins } from './controller/plugins'
import { SocketController } from './controller/socket'
import { register } from './discord/register'
import { generatePort } from './functions/port'
import { DiscordClient } from './discord/Client'
import { delay } from './functions/delay'

interface Args {
    command: string,
    alias: string[]
}

const args = (PKG_MODE ? argv : argv.splice(2)).map((arg) => arg.replace('--', '').replace('-', ''))
const argsList: Array<Args> = [
    { command: 'info', alias: ['i'] },
    { command: 'port', alias: ['p'] }
]

async function app() {
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
                const manifest = JSON.parse(await readFile(join(__dirname, '../manifest.json'), { encoding: 'utf-8' }))
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