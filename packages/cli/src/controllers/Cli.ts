import { metadata } from 'utils'
import { CommandManager } from './Command'
import { Arg } from './Arg'
import type { CliOptions } from '../types/cli'

const data = metadata()
const manager = new CommandManager(data.name)
export const commands = [
  {
    alias: ['-h'],
    command: 'help',
    description: 'Show all available arguments',
    rank: 0,
    hasString: false,
    exec() {
      console.log(manager.help())
      process.exit()
    },
  },
  {
    alias: ['-i'],
    command: 'info',
    description: 'Shows package information in JSON format',
    rank: 1,
    hasString: false,
    exec() {
      const infos = ['name', 'version', 'description', 'author', 'license'].reverse()
      console.info(Object.entries(data).reverse().filter(([key]) => infos.includes(key)).reduce((object, [key, value]) => ({ [key]: value, ...object }), {}))
    },
  },
  {
    alias: ['-p'],
    command: 'port',
    description: 'Starts the server on a specific port',
    rank: 2,
    hasString: true,
    exec: undefined
  }
] as const

type CallbackFn = { [Command in typeof commands[number]['command']]?: (content: string | number | undefined) => Promise<void> | void }

export class Cli {
  public functions?: CallbackFn
  public showHelp: boolean =  false
  
  constructor(options: CliOptions<CallbackFn>) {
    this.functions = options.functions
    if (options.showHelp) this.showHelp = options.showHelp
    
    const args = commands.map((arg, index) => new Arg({
      ...arg,
      exec: (this.functions as CallbackFn)[arg.command] ?? commands[index].exec ?? (() => {})
    }))
    const argv = (options?.argv ?? []).length > 0 ? options.argv as string[] : process.argv.splice(2)

    manager.addArgs(args)
    manager.run(argv, this.showHelp)
  }
}