import { Config } from '@/controller/config.js'
import { credentials } from '@/controller/crypt.js'
import { ApplicationCommandType, type BitFieldResolvable, Client, type GatewayIntentsString, IntentsBitField, Partials, PermissionsBitField } from 'discord.js'
import { Command } from './Commands.js'

export class Discord {
  public static client?: Client<boolean>
  constructor () {}

  async create () {
    console.log('💡 Criando o client do Discord')
    Discord.client = new Client({
      intents: Object.keys(IntentsBitField.Flags) as BitFieldResolvable<GatewayIntentsString, number>,
      partials: [Partials.Channel, Partials.GuildMember, Partials.Message, Partials.User, Partials.ThreadMember],
      failIfNotExists: false
    })
  }

  public async register () {
    if (Discord.client === undefined) await this.create()
    if (Config.all.length > 0) {
      new Command({
        name: 'config',
        pluginId: '-1',
        description: '[ ⚙️ configurar ] Use esse comando para configurar o bot.',
        dmPermission: false,
        type: ApplicationCommandType.ChatInput,
        defaultMemberPermissions: PermissionsBitField.Flags.Administrator,
        options: Config.all,
        async run() {},
      })
    }
    
    const commands = Array.from(Command.all.values())
    await (Discord.client as Client<boolean>).application?.commands.set(commands)
      .then(() => { console.log(`📝 ${commands.length} Commands defined successfully!`) })
      .catch((err) => { console.error(err) })
  }

  async stop () {
    if (Discord.client === undefined) await this.create()
    console.log(`💥 Destruindo conexão com o Discord`)
    void (Discord.client as Client<boolean>).destroy()
  }

  async start () {
    if (Discord.client?.isReady()) {
      console.log('⛔ Desculpe, mas já estou conectado ao Discord!')
      return
    }

    if (Discord.client === undefined) await this.create()

    console.log('📌 Iniciando Discord...')

    await (Discord.client as Client<boolean>).login(credentials.get('token') as string);
    (Discord.client as Client<boolean>).once('ready', async (client) => {
      await new Discord().register()
      console.info(`📡 Connected with ${client.user.username}`)
    })
  }
}
