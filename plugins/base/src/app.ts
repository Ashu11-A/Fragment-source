import { PKG_MODE } from '@/index'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { argv } from 'process'
import { register } from './discord/register'
import { SocketClient } from './controller/socket'
import { DiscordClient } from './discord/Client'
import { DiscordEvent } from '@/discord/Event'

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
    const client = new SocketClient()
    await register()

    if (args.length === 0) {
        return client.connect('3000')
    }
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
                client.connect(args[argNum])
                break
            }
        }
    }
}

void app ()