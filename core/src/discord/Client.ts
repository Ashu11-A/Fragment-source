import { BitFieldResolvable, Client, GatewayIntentsString, IntentsBitField, Partials } from "discord.js";
import { env } from "..";

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
        void Discord.client.login(env?.BOT_TOKEN)
        Discord.client.once('ready', async client => {
            console.info(`➝ Connected with ${client.user.username}`)
        })
    }
}