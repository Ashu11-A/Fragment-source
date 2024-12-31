import type { ArgTyped } from '../types/arg'

export class Arg<HasString extends boolean = false> {
  public readonly command: ArgTyped<HasString>['command']
  public readonly description: ArgTyped<HasString>['description']
  public readonly alias: ArgTyped<HasString>['alias']
  public readonly rank: ArgTyped<HasString>['rank']
  public readonly hasString: HasString
  public readonly exec: ArgTyped<HasString>['exec']

  constructor(options: { hasString: HasString } & ArgTyped<HasString>) {
    this.alias = options.alias
    this.command = options.command
    this.description = options.description
    this.rank = options.rank
    this.hasString = options.hasString
    this.exec = options.exec
  }

  validate(input: string) {
    if (this.hasString) {
      if (!input) throw new Error(`Expected argument after ${this.command}, but none was supplied.`)
      return input as HasString extends true ? string : undefined
    }
    return undefined as HasString extends true ? string : undefined
  }
}