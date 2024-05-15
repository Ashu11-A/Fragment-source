import { ApplicationCommandSubCommandData, CacheType, ChatInputCommandInteraction } from "discord.js";

interface ConfigOptions extends ApplicationCommandSubCommandData {
    name: string
    run: (interaction: ChatInputCommandInteraction<CacheType>) => any
}

export class Config {
    public static all: ConfigOptions[] = []
    constructor (data: ConfigOptions) {
        Config.all.push(data)
    }
}