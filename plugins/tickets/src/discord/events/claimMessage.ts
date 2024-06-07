import { ClaimBuilder } from "@/class/ClaimBuilder";
import { Database } from "@/controller/database";
import Claim from "@/entity/Claim.entry";
import { AuditLogEvent, EmbedBuilder } from "discord.js";
import { Event } from "../base";
const claim = new Database<Claim>({ table: 'Claim' })

new Event({
  name: 'messageDelete',
  async run(message) {
    if (!message.inGuild()) return
    const { id } = message
    const claimData = await claim.findOne({ where: { messageId: id }, relations: { ticket: true } })
    if (claimData === null || claimData?.ticket?.id === undefined) return

    const builder = await new ClaimBuilder({ interaction: message }).setTicketId(claimData.ticket.id).render()
    if (builder === undefined) return

    const nemMessage = await message.channel.send({
      embeds: [builder.embed as EmbedBuilder],
      components: builder.buttons
    })

    await claim.save(Object.assign(claimData, { messageId: nemMessage.id }))

    const auditLog = (await message.guild.fetchAuditLogs({ type: AuditLogEvent.MessageDelete })).entries.first()
    await message.channel.send({
      content: auditLog?.executor?.id !== undefined ? `<@${auditLog?.executor?.id}>` : undefined,
      embeds: [new EmbedBuilder({
        title: '⚠️ Não é possivel deletar a messagem acima!',
        footer: { text: 'Essa mensagem será deletada em 5s' }
      }).setColor('Red')]
    })
      .then(async (msg) => setTimeout(() => { msg.delete() }, 5000))
  },
})