import { root } from '@/singletons.js'
import { lang } from '@/lang.js'
import { storage } from '@/storage.js'
import { Command } from 'discord'
import { type ApplicationCommandOptionChoiceData, ApplicationCommandOptionType, ApplicationCommandType, EmbedBuilder, MessageFlags } from 'discord.js'
import { glob } from 'glob'

export default new Command({
  name: 'language',
  description: '[ ☢️ Core ] Set current language',
  dmPermission: false,
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: 'name',
      description: 'Loaded directly from your directory',
      type: ApplicationCommandOptionType.String,
      autocomplete: true,
      required: true,
    },
  ],
  async autocomplete(interaction) {
    const { options } = interaction
    const response: ApplicationCommandOptionChoiceData[] = []

    switch (options.getFocused(true).name) {
    case 'name': {
      const languages = await glob('locales/*', { cwd: root })
      response.push(...languages.map((entry) => {
        const name = entry.split('/').at(-1) ?? entry
        return { name, value: name } satisfies ApplicationCommandOptionChoiceData
      }))
      break
    }
    }

    await interaction.respond(response)
  },
  async run(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    const language = interaction.options.getString('name', true)
    const languageChange = await lang.set(language)
    await storage.append('.data', { language: languageChange }, { isJson: true })

    await interaction.editReply({
      embeds: [
        new EmbedBuilder({
          title: languageChange === language ? i18('commands.lang.sucess') : i18('commands.lang.error'),
        }).setColor(languageChange === language ? 'Green' : 'Red'),
      ],
    })
  },
})
