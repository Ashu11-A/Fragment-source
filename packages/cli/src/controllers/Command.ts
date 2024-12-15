import { Arg } from './Arg'

export class CommandManager<Args extends Arg<boolean>[] = []>{
  args: Args
  constructor(public packageName: string, args: Args | undefined = [] as unknown as Args) {
    this.args = args
  }

  addArg(arg: Arg<boolean>) { this.args.push(arg) }
  addArgs(args: Arg<boolean>[]) { this.args.push(...args) }

  validate(input: string[]) {
    for (const arg of input.filter((arg) => arg.includes('-'))) {
      const allArgs = this.args.flatMap(({ command, alias }) => [command, ...alias.map((alia) => alia || command)])
  
      if (!allArgs.includes(arg)) throw new Error(`Not found arg ${arg}, try --help`)
    }
  }

  formatAliasToCommand(input: string[]): Arg<boolean>[] {
    const newArgs: Arg<boolean>[] = []

    for (let index = 0; index < input.length; index++) {
      for (const arg of this.args) {
        if (arg.alias.includes(input[index]) || input[index] === arg.command) {
          if (arg.hasString) {
            if (input[index + 1]?.startsWith('-')) {
              newArgs.push(arg)
              continue
            }
            ++index
            newArgs.push(new Arg({
              ...arg,
              exec: () => arg.exec(arg.validate(input[index])),
            }))
          } else {
            newArgs.push(arg)
          }
        }
      }
    }

    return newArgs
  }

  help () {
    const output: string[] = []
    output.push(`Usage: '${this.packageName}' '[options]'}\n`)
    output.push('  Options:\n')

    const maxAliasLength = Math.max(...this.args.map(arg => arg.alias.join(', ').length))
    const maxCommandLength = Math.max(...this.args.map(arg => `--${arg.command}`.length))

    for (const arg of this.args) {
      const alias = arg.alias.join(', ')
      const command = `--${arg.command}`
      const aliasPadding = ' '.repeat(maxAliasLength - alias.length)
      const commandPadding = ' '.repeat(maxCommandLength - command.length)

      output.push(`   ${alias}${aliasPadding} ${command}${commandPadding} ${arg.description}`)
    }
    return output.join('\n')
  }

  async run(input: string[], showHelp: boolean) {
    input = input.map((arg) => arg.replaceAll('--', ''))
    this.validate(input)

    const args = this.formatAliasToCommand(input).sort((A, B) => A.rank - B.rank)
    if (args.length === 0 && showHelp) {
      console.log(this.help())
      return
    }
    for (const arg of args) {
      await arg.exec(undefined)
    }
  }
}