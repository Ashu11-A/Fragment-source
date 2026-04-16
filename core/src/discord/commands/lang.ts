import { root } from '@/index.js'
import { lang } from '@/lang.js'
import { storage } from '@/storage.js'
import { createCommand } from 'discord'
import { type ApplicationCommandOptionChoiceData, ApplicationCommandOptionType, ApplicationCommandType, EmbedBuilder, MessageFlags } from 'discord.js'
import { glob } from 'glob'

export default createCommand({
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
      required: true
    }
  ],
  async autocomplete(interaction) {
    const { options } = interaction
    const response: ApplicationCommandOptionChoiceData[] = []

    switch (options.getFocused(true).name) {
    case 'name': {
      const languages = await glob('locales/*', { cwd: root })

      response.push(...languages.map((lang) => {
        const lastValue = lang.split('/').length - 1
        
        return {
          name: lang.split('/')[lastValue], // pt-BR
          value: lang.split('/')[lastValue]
        } satisfies ApplicationCommandOptionChoiceData
      }))
      break
    }
    }
    await interaction.respond(response)
  },
  async run(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    const { options } = interaction
    const language = options.getString('name', true)

    const languageChange = await lang.set(language)
    await storage.append('.data', { language: languageChange }, { isJson: true })
    
    if (languageChange ===  language)
      await interaction.editReply({
        embeds: [new EmbedBuilder({
          title: i18('commands.lang.sucess')
        }).setColor('Green')]
      })
    else {
      await interaction.editReply({
        embeds: [new EmbedBuilder({
          title: i18('commands.lang.error')
        }).setColor('Red')]
      })
    }
  },
})