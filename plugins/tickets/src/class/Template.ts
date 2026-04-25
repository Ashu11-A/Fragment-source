import { TypeTemplate } from '@/types/entries.js'
import { database } from '@/database'
import { Error } from 'discord'
import { CommandInteraction } from 'discord.js'
import { TemplateManager } from './TemplateManager.js'
import { BaseInteractionBuilder, type CachedInteraction } from './BaseInteractionBuilder.js'

interface TicketOptions {
    interaction: CachedInteraction
}

interface TicketCreate {
    title: string,
    description: string
    channelId: string
    guildId: string
}

export class Template extends BaseInteractionBuilder {
  constructor ({ interaction }: TicketOptions) {
    super({ interaction })
  }

  async create ({ title, description, channelId, guildId }: TicketCreate) {
    if (!(this.interaction instanceof CommandInteraction)) return
    if (!this.interaction.deferred) await this.interaction.deferReply()

    const channel = await this.validateTextChannel(channelId)
    if (channel === null) return

    const manager = new TemplateManager({ interaction: this.interaction })
      .setTitle(title)
      .setDescription(description)
      .setMode('debug')
      .setType(TypeTemplate.Button)

    const embed = manager.renderEmbed({
      footer: {
        text: `Equipe ${this.guild.name}`,
        icon_url: this.guild.iconURL({ size: 64 }) ?? undefined
      }
    })
    const components = manager.renderComponents()

    await channel.send({ embeds: [embed], components }).then(async (message) => {
      const guild = await database.guild.findOne({ where: { guildId } })
      if (guild === null) {
        await new Error({ element: 'Guild', interaction: this.interaction }).notFound({ type: 'Database' }).reply()
        return
      }
      const create = await database.template.create({
        guild,
        messageId: message.id,
        channelId: channel.id,
        embed: embed.data,
      })
      await database.template.save(create)
    })
  }
}
