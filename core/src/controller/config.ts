import { ApplicationCommandSubCommandData } from 'discord.js'

export interface ConfigOptions extends ApplicationCommandSubCommandData {
  name: string
  pluginId: string
}

export class Config {
  public static all: ConfigOptions[] = []
  constructor (data: ConfigOptions) {
    Config.all.push(data)
  }
}