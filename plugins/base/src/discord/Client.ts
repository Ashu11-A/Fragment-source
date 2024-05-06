import { SocketClient } from "@/controller/socket";
import { BitFieldResolvable, Client, GatewayIntentsString, IntentsBitField, Partials } from "discord.js";

export class DiscordClient {
    public static client: Client<boolean>
    constructor() {}

    async createClient () {
        DiscordClient.client = new Client({
            intents: Object.keys(IntentsBitField.Flags) as BitFieldResolvable<GatewayIntentsString, number>,
            partials: [Partials.Channel, Partials.GuildMember, Partials.Message, Partials.User, Partials.ThreadMember],
            failIfNotExists: false,
        })
    }

    async start () {
        await DiscordClient.client.login(SocketClient.key)
        DiscordClient.client.once('ready', async client => {
            console.info(`➝ Connected with ${client.user.username}`)
        })
    }
}