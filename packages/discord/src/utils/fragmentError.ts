import {
  EmbedBuilder,
  Message,
  MessageComponentInteraction,
} from 'discord.js'
import type { DiscordErrorOptions, NotFoundType } from '@/types/interactions.js'

/** Respostas de erro embutidas para interações Discord (embeds em pt-BR). */
export class DiscordError {
  private readonly options: DiscordErrorOptions
  private embed: EmbedBuilder | undefined

  constructor (options: DiscordErrorOptions) {
    this.options = options
  }

  notFound ({ type }: { type: NotFoundType }) {
    const { element, color } = this.options
    let embed: EmbedBuilder
    switch (type) {
    case 'Database': {
      embed = new EmbedBuilder({ title: `Não encontrei \`${element}\` no database!` })
      break
    }
    case 'Channel': {
      embed = new EmbedBuilder({ title: `Não encontrei o channel \`${element}\` no servidor!` })
      break
    }
    case 'Message': {
      embed = new EmbedBuilder({ title: `Não encontrei a message ${element} no servidor!` })
      break
    }
    }

    embed.setColor(color ?? 'Red')
    this.embed = embed
    return this
  }

  invalidProperty () {
    const { element, color } = this.options
    this.embed = new EmbedBuilder({ title: `Propriedade \`${element}\` é invalida!` }).setColor(color ?? 'Red')
    return this
  }

  notPossible () {
    const { element, color } = this.options
    this.embed = new EmbedBuilder({ title: `Não foi possivel \`${element}\`` }).setColor(color ?? 'Red')
    return this
  }

  forbidden () {
    const { element, color } = this.options
    this.embed = new EmbedBuilder({ title: `Não é fazer isso, pois \`${element}\` não tem permisão!` }).setColor(color ?? 'Red')
    return this
  }

  async reply () {
    const { interaction, ephemeral } = this.options
    if (this.embed === undefined) return
    if (!(interaction instanceof Message) && interaction.isRepliable() && !interaction.replied) {
      if (interaction.deferred) {
        await interaction.editReply({ embeds: [this.embed] })
        return
      }
      if (!interaction.replied) {
        await interaction.reply({ embeds: [this.embed], ephemeral: ephemeral ?? true })
          .catch(async () => {
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
