import { PKG_MODE } from '@/index'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { argv } from 'process'

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
    if (args.length === 0) {
        return console.log('Teste')
    }
    for (let argNum = 0; argNum < args.length; argNum++) {
        for (const { alias, command } of argsList) {
            if (alias.includes(args[argNum]) ) args[argNum] = command
        }

        switch (args[argNum]) {
            case 'info': {
                const manifest = JSON.parse(await readFile(join(__dirname, '../manifest.json'), { encoding: 'utf-8' }))
                console.clear()
                console.info(manifest)
                break
            }
            case 'port': {
                argNum++
                console.log(args[argNum])
                break
            }
        }
    }    
}

void app ()