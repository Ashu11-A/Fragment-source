import { database } from '@/database'
import { TemplateBuilder } from '@/class/TemplateBuilder.js'
import { TemplateButtonBuilder } from '@/class/TemplateButtonBuilder.js'
import { createEvent } from 'discord'
import { Message } from 'discord.js'

export default createEvent({
  name: 'messageDeleteTemplateBotResend',
  event: 'messageDelete',
  async run (message) {
    if (!message.author?.bot || !(message instanceof Message) || !message.inGuild()) return
    const template = await database.template.findOne({ where: { messageId: message.id } })
    if (template === null) return

    const embed = new TemplateBuilder({ interaction: message }).render(message.embeds[0].toJSON())
    const buttons = new TemplateButtonBuilder().setProperties(template.properties).setSelects(template.selects).setMode('production').render()
    const newMessage = await message.channel.send({ embeds: [embed], components: buttons })
    await database.template.update({ id: template.id }, { messageId: newMessage.id })
  },
})
