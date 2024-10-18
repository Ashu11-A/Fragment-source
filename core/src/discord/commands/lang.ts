import { Lang } from '@/controller/lang.js'
import { RootPATH } from '@/index.js'
import { ApplicationCommandOptionChoiceData, ApplicationCommandOptionType, ApplicationCommandType, EmbedBuilder } from 'discord.js'
import { glob } from 'glob'
import { Command } from '../base/Commands.js'
import { i18 } from '@/controller/lang.js'

new Command({
  name: 'language',
  description: '[ ☢️ Core ] Set current language',
  dmPermission: false,
  pluginId: '-1',
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: 'name',
      description: 'Loaded directly from your directory',
      type: ApplicationCommandOptionType.String,
      autocomplete: true,
      required: true
    }
  ],
  async autoComplete(interaction) {
    const { options } = interaction
    const response: ApplicationCommandOptionChoiceData[] = []

    switch (options.getFocused(true).name) {
    case 'name': {
      const languages = await glob('locales/**/*.json', { cwd: RootPATH })
      response.push(...languages.map((lang) => ({
        name: lang.split('/')[lang.split('/').length - 2], // pt-BR
        value: lang.split('/')[lang.split('/').length - 2]
      } satisfies ApplicationCommandOptionChoiceData)))
      break
    }
    }
    await interaction.respond(response)
  },
  async run(interaction) {
    await interaction.deferReply({ ephemeral: true })
    const { options } = interaction
    const lang = options.getString('name', true)

    await new Lang().setLanguage(lang, true)
      .then(async () => {
        await interaction.editReply({
          embeds: [new EmbedBuilder({
            title: i18('commands.lang.sucess')
          }).setColor('Green')]
        })
      })
      .catch(async (err) => {
        console.log(err)
        await interaction.editReply({
          embeds: [new EmbedBuilder({
            title: i18('commands.lang.error')
          }).setColor('Red')]
        })
      })
  },
})