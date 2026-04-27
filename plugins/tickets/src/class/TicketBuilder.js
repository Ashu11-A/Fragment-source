import Ticket, {} from '@/database/entity/Ticket.entry.js';
import { database } from '@/database';
import { ActionDrawer, ButtonBuilder, buttonRedirect, DiscordError } from 'discord';
import { ActionRowBuilder, ButtonInteraction, ButtonStyle, ChannelType, codeBlock, CommandInteraction, EmbedBuilder, Message, ModalSubmitInteraction, PartialGroupDMChannel, PermissionsBitField, StringSelectMenuInteraction, TextChannel, User } from 'discord.js';
import { ClaimBuilder } from './ClaimBuilder.js';
import { Ticket as TicketFunctions } from './Ticket.js';
export class TicketBuilder {
    options;
    embed;
    buttons;
    user;
    channelId;
    ticketId;
    templateId;
    interaction;
    constructor({ interaction }) {
        this.interaction = interaction;
        if (interaction instanceof Message) {
            this.user = interaction.author;
        }
        else {
            this.user = interaction.user;
        }
        this.options = {
            ownerId: undefined,
            title: undefined,
            description: undefined,
            closed: false,
            channelId: undefined,
            messageId: undefined,
            voice: undefined,
            category: { emoji: '🎫', title: 'Tickets' },
            team: [],
            users: [],
            messages: [],
            history: [],
            events: []
        };
    }
    setData(data) {
        this.options = Object.assign(this.options, data);
        this.ticketId = data.id;
        return this;
    }
    setTicket(channelId) { this.channelId = channelId; return this; }
    setTemplateId(id) { this.templateId = id; return this; }
    setOwner(id) { this.options.ownerId = id; return this; }
    setTitle(content) { this.options.title = content; return this; }
    setDescription(content) { this.options.description = content; return this; }
    setClosed(isClosed) { this.options.closed = isClosed ?? false; return this; }
    setVoice(voice) { this.options.voice = voice; return this; }
    setCategory(category) { this.options.category = category; return this; }
    setUser(user) { this.user = user; return this; }
    addTeam(user) { this.options.team.push(user); return this; }
    addUsers(user) { this.options.users.push(user); return this; }
    addEvent(event) { this.options.events.push(event); return this; }
    addHistory(content) { this.options.history.push(content); return this; }
    addMessage(message) { this.options.messages.push(message); return this; }
    permissions() {
        const { guild } = this.interaction;
        const { team, users, ownerId } = this.options;
        const permissionOverwrites = [];
        const permissions = [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.AttachFiles,
            PermissionsBitField.Flags.AddReactions,
            PermissionsBitField.Flags.ReadMessageHistory
        ];
        if (ownerId !== '' && ownerId !== undefined)
            permissionOverwrites.push({ id: ownerId, allow: permissions });
        permissionOverwrites.push({ id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] });
        permissionOverwrites.push({ id: this.user.id, allow: permissions });
        for (const user of team)
            permissionOverwrites.push({ id: user.id, allow: permissions });
        for (const user of users)
            permissionOverwrites.push({ id: user.id, allow: permissions });
        return permissionOverwrites;
    }
    render() {
        const { guild } = this.interaction;
        const { description, title, closed } = this.options;
        const isOpen = !closed;
        const embed = new EmbedBuilder({
            title: `👋 Olá ${this.user.displayName}, boas vindas ao seu ticket.`,
            footer: { text: `Equipe ${guild?.name} | ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`, iconURL: (guild?.iconURL({ size: 64 }) ?? undefined) }
        }).setColor('Blue');
        if (typeof title === 'string')
            embed.addFields({ name: '📃 Motivo:', value: codeBlock(title) });
        if (typeof description === 'string')
            embed.addFields({ name: '📭 Descrição:', value: codeBlock(description) });
        const buttons = [];
        buttons.push(new ButtonBuilder({
            customId: 'Switch',
            label: isOpen ? 'Fechar' : 'Abrir',
            emoji: { name: isOpen ? '🔓' : '🔒' },
            style: isOpen ? ButtonStyle.Danger : ButtonStyle.Success
        }), new ButtonBuilder({
            customId: 'Panel',
            label: 'Painel',
            emoji: { name: '🖥️' },
            style: ButtonStyle.Success
        }));
        if (!isOpen) {
            buttons.push(new ButtonBuilder({
                customId: 'Close-With-Question',
                label: 'Fechar com Relatorio',
                emoji: { name: '📝' },
                style: ButtonStyle.Primary
            }), new ButtonBuilder({
                customId: 'Close',
                label: 'Fechar',
                emoji: { name: '🗑️' },
                style: ButtonStyle.Danger
            }));
        }
        this.embed = embed;
        this.buttons = ActionDrawer(buttons, 5);
        return this;
    }
    async create() {
        const { guild } = this.interaction;
        const { category: categoryData } = this.options;
        if (guild === null || this.interaction instanceof Message || this.interaction instanceof CommandInteraction)
            return;
        if (!this.interaction.deferred)
            await this.interaction.deferReply({ ephemeral: true });
        const request = this?.templateId !== undefined ? { id: this.templateId } : { messageId: this.interaction.message?.id };
        const templateData = await database.template.findOne({ where: request });
        if (templateData === null)
            return await new DiscordError({ element: 'esse template', interaction: this.interaction }).notFound({ type: 'Database' }).reply();
        const category = (await guild.channels.fetch()).find((channel) => channel?.type === ChannelType.GuildCategory && channel.name === categoryData.title)
            ?? await guild.channels.create({
                name: categoryData.title,
                type: ChannelType.GuildCategory
            });
        const channel = await guild.channels.create({
            name: `${categoryData.emoji}-${this.user.displayName}`,
            type: ChannelType.GuildText,
            topic: `Ticket do(a) ${this.user.username}, ID: ${this.user.id}`,
            permissionOverwrites: this.permissions(),
            parent: category.id
        });
        if (this.embed === undefined || this.buttons === undefined)
            this.render();
        const messageMain = await channel.send({ embeds: [this.embed], components: this.buttons });
        const guildRelaction = await database.guild.findOne({ where: { guildId: guild.id } });
        if (guildRelaction === null)
            return await new DiscordError({ element: 'Guild', interaction: this.interaction }).notFound({ type: 'Database' }).reply();
        const templateRelaction = await database.template.findOne({ where: { id: this.templateId } });
        if (templateRelaction === null)
            return await new DiscordError({ element: 'Template', interaction: this.interaction }).notFound({ type: 'Database' }).reply();
        this.options = Object.assign(this.options, {
            channelId: channel.id,
            messageId: messageMain.id,
            guild: guildRelaction,
            template: templateRelaction
        });
        const ticketData = await database.ticket.create(this.options);
        const result = await database.ticket.save(ticketData);
        if (result === null || result === undefined) {
            await channel.delete('Error');
            await new DiscordError({ element: 'salvar os dados no Database', interaction: this.interaction }).notPossible().reply();
            return null;
        }
        const claimError = new DiscordError({ element: 'criar o claim do seu ticket', interaction: this.interaction }).notPossible();
        const claim = await new ClaimBuilder({ interaction: this.interaction })
            .setData(result)
            .render();
        if (claim === undefined) {
            await claimError.reply();
            return;
        }
        const create = await claim.create();
        if (create === undefined) {
            await claimError.reply();
            return;
        }
        await this.interaction.editReply({
            embeds: [new EmbedBuilder({ title: '✅ Seu Ticket foi criado com sucesso!' }).setColor('Green')],
            components: [buttonRedirect({
                    channelId: channel.id,
                    guildId: guild.id,
                    label: 'Ir ao Ticket',
                    emoji: { name: '🎫' }
                })]
        });
        return ticketData;
    }
    async loader() {
        if (this.channelId === undefined)
            throw new DiscordError({ element: 'executar essa ação, pois setTicket não foi configurado!', interaction: this.interaction }).notPossible().reply();
        const ticketData = await database.ticket.findOne({ where: { channelId: this.channelId } });
        if (ticketData !== null)
            this.options = ticketData;
        return this;
    }
    async delete(options) {
        if (this.interaction instanceof Message)
            return;
        const claimBuilder = new ClaimBuilder({ interaction: this.interaction });
        const ticketData = await database.ticket.findOne({ where: { channelId: this.channelId }, relations: { claim: true } });
        if (ticketData === null) {
            await new DiscordError({ element: 'as informações do ticket', interaction: this.interaction }).notFound({ type: 'Database' }).reply();
            return;
        }
        const channel = await this.interaction.client.channels.fetch(ticketData.channelId).catch(() => null);
        if (!channel?.isTextBased()) {
            await new DiscordError({ element: ticketData.channelId, interaction: this.interaction }).notFound({ type: 'Channel' }).reply();
            return;
        }
        await channel.delete();
        for (const { channelId, messageId } of ticketData.messages) {
            const channel = await this.interaction.client.channels.fetch(channelId).catch(() => null);
            if (channel === null || !channel.isTextBased())
                continue;
            const message = await channel.messages.fetch(messageId).catch(() => null);
            if (message === null)
                continue;
            if (message.deletable)
                await message.delete();
        }
        await new TicketFunctions({ interaction: this.interaction }).transcript({ messageId: ticketData.claim.messageId, observation: options?.observation, reason: options?.reason });
        await database.ticket.delete({ id: ticketData.id });
        await claimBuilder.delete(ticketData.claim.id);
    }
    async edit() {
        if (this.ticketId === undefined)
            throw new DiscordError({ element: 'executar essa ação, pois o Id do ticket não foi setado!', interaction: this.interaction }).notPossible().reply();
        await database.ticket.update({ id: this.ticketId }, this.options);
        return this;
    }
    async send(embeds) {
        if (this.ticketId === undefined)
            throw new DiscordError({ element: 'executar essa ação, pois o Id do ticket não foi setado!', interaction: this.interaction }).notPossible().reply();
        const ticketData = await database.ticket.findOne({ where: { id: this.ticketId } });
        if (ticketData === null) {
            await new DiscordError({ element: 'as informações do ticket', interaction: this.interaction }).notFound({ type: 'Database' }).reply();
            return;
        }
        const channel = await this.interaction.client.channels.fetch(ticketData.channelId).catch(() => null);
        if (!channel?.isTextBased() || channel instanceof PartialGroupDMChannel) {
            await new DiscordError({ element: ticketData.channelId, interaction: this.interaction }).notFound({ type: 'Channel' }).reply();
            return;
        }
        await channel.send({ embeds });
        return this;
    }
    async update() {
        if (this.ticketId === undefined)
            throw new DiscordError({ element: 'executar essa ação, pois o Id do ticket não foi setado!', interaction: this.interaction }).notPossible().reply();
        const ticketData = await database.ticket.findOne({ where: { id: this.ticketId } });
        if (ticketData === null) {
            await new DiscordError({ element: 'as informações do ticket', interaction: this.interaction }).notFound({ type: 'Database' }).reply();
            return;
        }
        const channel = await this.interaction.client.channels.fetch(ticketData.channelId).catch(() => null);
        if (!channel?.isTextBased()) {
            await new DiscordError({ element: ticketData.channelId, interaction: this.interaction }).notFound({ type: 'Channel' }).reply();
            return;
        }
        const message = await channel.messages.fetch(ticketData.messageId).catch(() => null);
        if (message === null) {
            await new DiscordError({ element: ticketData.messageId, interaction: this.interaction }).notFound({ type: 'Message' }).reply();
            return;
        }
        if (this.embed === undefined || this.buttons === undefined)
            this.render();
        const embed = this.embed;
        const buttons = this.buttons;
        await this.edit();
        await channel.edit({ permissionOverwrites: this.permissions() });
        await message.edit({ embeds: [embed], components: buttons });
        return this;
    }
}
