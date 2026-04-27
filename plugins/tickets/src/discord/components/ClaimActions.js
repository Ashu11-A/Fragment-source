import { database } from '@/database';
import { Ticket } from '@/class/Ticket.js';
import { TicketBuilder } from '@/class/TicketBuilder.js';
import { Button, DiscordError, YouSure, buttonRedirect } from 'discord';
import { EmbedBuilder, MessageFlags } from 'discord.js';
export const Claim = new Button({
    parser: 'Claim',
    async onClick(interaction) {
        if (!interaction.inCachedGuild())
            return;
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const { message, user, guildId, guild, channel } = interaction;
        const claimData = await database.claim.findOne({ where: { messageId: message.id }, relations: { ticket: true } });
        if (claimData === undefined || claimData?.ticket === undefined)
            return await new DiscordError({ element: 'Claim', interaction }).notFound({ type: 'Database' }).reply();
        const userTicket = await guild.client.users.fetch(claimData.ticket.ownerId).catch(() => undefined);
        if (userTicket === undefined) {
            await interaction.editReply({
                embeds: [new EmbedBuilder({ title: '⚠️ | Usuário não se encontra mais no servidor, você pode apenas apagar o ticket!' }).setColor('Red')]
            });
            return;
        }
        const goTicket = buttonRedirect({ guildId, channelId: claimData.ticket.channelId, emoji: { name: '🎫' }, label: 'Ir ao Ticket' });
        if (claimData.ticket.team.find((userTeam) => userTeam.id === user.id) !== undefined) {
            await interaction.editReply({
                embeds: [new EmbedBuilder({ title: '❌ | Você já está atendendo este ticket!' }).setColor('Red')],
                components: [goTicket]
            });
            return;
        }
        ;
        (await (new TicketBuilder({ interaction }).setData(claimData.ticket)
            .addTeam({ displayName: user.displayName, id: user.id, name: user.username })
            .addEvent({ date: new Date(), message: `Usuário ${user.displayName}, reivindicou o ticket!`, user: { id: user.id, name: user.username } })
            .update()))?.send([new EmbedBuilder({ title: `Usuário ${user.displayName}, reivindicou o ticket!` }).setColor('Green')])
            .then(async () => {
            await interaction.editReply({
                embeds: [new EmbedBuilder({ title: `Olá ${user.username}`, description: '✅ | Você foi adicionado ao ticket!' }).setColor('Green')],
                components: [goTicket]
            });
            await channel?.send({ embeds: [new EmbedBuilder({ title: `Usuário ${user.displayName}, reivindicou o ticket do ${userTicket.displayName}` }).setColor('Green')] });
        });
    },
});
export const Delete = new Button({
    parser: 'Delete',
    async onClick(interaction) {
        if (!interaction.inCachedGuild())
            return;
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const { message } = interaction;
        const claimData = await database.claim.findOne({ where: { messageId: message.id }, relations: { ticket: true } });
        if (claimData === null)
            throw await new DiscordError({ element: 'este claim', interaction }).notFound({ type: 'Database' }).reply();
        const builder = new TicketBuilder({ interaction });
        const isDeletable = await new YouSure({ interaction, title: 'Tem certeza que desseja deletar este ticket?' }).question();
        if (isDeletable)
            await builder.setTicket(claimData.ticket.channelId).delete();
    },
});
export const Transcript = new Button({
    parser: 'Transcript',
    async onClick(interaction) {
        if (!interaction.inCachedGuild())
            return;
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        await new Ticket({ interaction }).transcript({ messageId: interaction.message.id });
    },
});
