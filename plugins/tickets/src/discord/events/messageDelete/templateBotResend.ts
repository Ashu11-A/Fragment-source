import { database } from '@/database'
import { TemplateManager } from '@/class/TemplateManager.js'
import { Event } from 'discord'
import { Message } from 'discord.js'

export default new Event({
  name: 'messageDeleteTemplateBotResend',
  event: 'messageDelete',
  async run (message) {
    if (!message.author?.bot || !(message instanceof Message) || !message.inGuild()) return
    const template = await database.template.findOne({ where: { messageId: message.id } })
    if (template === null) return

    const manager = new TemplateManager({ interaction: message, template }).setMode('production')
    const embed = manager.renderEmbed(message.embeds[0].toJSON())
    const components = manager.renderComponents()
    const newMessage = await message.channel.send({ embeds: [embed], components })
    await database.template.update({ id: template.id }, { messageId: newMessage.id })
  },
})
