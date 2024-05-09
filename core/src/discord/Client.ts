import { type BitFieldResolvable, Client, type GatewayIntentsString, IntentsBitField, Partials } from 'discord.js'
import { env } from '..'
import { Command } from './Commands'

export class Discord {
  public static client: Client<boolean>
  constructor () {}

  async createClient () {
    Discord.client = new Client({
      intents: Object.keys(IntentsBitField.Flags) as BitFieldResolvable<GatewayIntentsString, number>,
      partials: [Partials.Channel, Partials.GuildMember, Partials.Message, Partials.User, Partials.ThreadMember],
      failIfNotExists: false
    })
  }

  async register () {
    const commands = Array.from(Command.all.values())
    await Discord.client.application?.commands.set(commands)
      .then((c) => { console.log(`📝 ${commands.length} Commands defined successfully!`) })
      .catch((err) => { console.error(err) })
  }

  async start () {
    void Discord.client.login(env?.BOT_TOKEN)
    Discord.client.once('ready', async client => {
      await this.register()
      console.info(`📡 Connected with ${client.user.username}`)
    })
  }
}
