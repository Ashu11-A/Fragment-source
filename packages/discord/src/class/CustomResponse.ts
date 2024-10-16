import { EmbedBuilder, Message, MessageComponentInteraction, type ButtonInteraction, type CacheType, type ColorResolvable, type CommandInteraction, type ModalSubmitInteraction, type StringSelectMenuInteraction } from 'discord.js'

interface ErrorOptions {
    interaction: CommandInteraction<CacheType> | ModalSubmitInteraction<CacheType> | ButtonInteraction<CacheType> | StringSelectMenuInteraction<CacheType> | Message<boolean>
    ephemeral?: boolean
    element: string
    color?: ColorResolvable
}

type TypesNotFound = 'Database' | 'Channel' | 'Message'

export class Error {
  private readonly options: ErrorOptions
  private embed: EmbedBuilder | undefined

  constructor (options: ErrorOptions) {
    this.options = options
  }

  notFound ({ type }: { type: TypesNotFound }) {
    const { element, color } = this.options
    let embed: EmbedBuilder
    switch (type) {
    case 'Database': {
      embed = new EmbedBuilder({ title: `Não encontrei \`${element}\` no database!`})
      break
    }
    case 'Channel': {
      embed = new EmbedBuilder({ title: `Não encontrei o channel \`${element}\` no servidor!`})
      break
    }
    case 'Message': {
      embed = new EmbedBuilder({ title: `Não encontrei a message ${element} no servidor!`})
      break
    }
    }

    embed.setColor(color ?? 'Red')
    this.embed = embed
    return this
  }

  invalidProperty () {
    const { element, color } = this.options
    const embed = new EmbedBuilder({
      title: `Propriedade \`${element}\` é invalida!`
    }).setColor(color ?? 'Red')
    this.embed = embed
    return this
  }

  notPossible () {
    const { element, color } = this.options
    this.embed = new EmbedBuilder({
      title: `Não foi possivel \`${element}\``
    }).setColor(color ?? 'Red')
    return this
  }

  forbidden() {
    const { element, color } = this.options
    this.embed = new EmbedBuilder({
      title: `Não é fazer isso, pois \`${element}\` não tem permisão!`
    }).setColor(color ?? 'Red')
    return this
  }

  async reply () {
    const { interaction, ephemeral } = this.options

    if (this.embed === undefined) return
    if (!(interaction instanceof Message) && interaction.isRepliable() && !interaction.replied) {
      console.log(interaction.deferred)
      if (interaction.deferred) {
        await interaction.editReply({ embeds: [this.embed] })
        return
      }
      if (!interaction.replied) {
        await interaction.reply({ embeds: [this.embed], ephemeral: ephemeral ?? true })
          .catch(async (err) => {
            console.log(err)
            return await interaction.editReply({ embeds: [this.embed as EmbedBuilder] })
          })
        return
      }
      if (interaction instanceof MessageComponentInteraction) {
        await interaction.update({ embeds: [this.embed], components: [] })
        return
      }
    }
  }
}