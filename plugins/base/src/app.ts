import { PKG_MODE } from '@/index'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { argv } from 'process'
import { SocketClient } from './controller/socket'
import { register } from './discord/register'

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
                const port = args[argNum]
                console.log(port)
                client.connect(port)
                break
            }
        }
    }
}

void app ()