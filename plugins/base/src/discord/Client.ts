import { SocketClient } from "@/controller/socket";
import { BitFieldResolvable, Client, GatewayIntentsString, IntentsBitField, Partials } from "discord.js";

export class Discord {
    public static client: Client<boolean>
    constructor() {}

    async createClient () {
        Discord.client = new Client({
            intents: Object.keys(IntentsBitField.Flags) as BitFieldResolvable<GatewayIntentsString, number>,
            partials: [Partials.Channel, Partials.GuildMember, Partials.Message, Partials.User, Partials.ThreadMember],
            failIfNotExists: false,
        })
    }

    async start () {
        await Discord.client.login(SocketClient.key)
        Discord.client.once('ready', async client => {
            console.info(`➝ Connected with ${client.user.username}`)
        })
    }
}