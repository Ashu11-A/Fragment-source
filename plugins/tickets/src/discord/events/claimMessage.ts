import { ClaimBuilder } from "@/class/ClaimBuilder.js";
import { Database } from "@/controller/database.js";
import Claim from "@/entity/Claim.entry.js";
import { AuditLogEvent, EmbedBuilder } from "discord.js";
import { Event } from "@/discord/base/index.js";
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
      }).setColor('Red')]
    })
      .then(async (msg) => setTimeout(() => { msg.delete() }, 5000))
  },
})