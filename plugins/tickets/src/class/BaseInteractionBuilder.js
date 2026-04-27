import { ButtonInteraction, CommandInteraction, Guild, GuildBasedChannel, Message, ModalSubmitInteraction, StringSelectMenuInteraction, User } from 'discord.js';
import { DiscordError } from 'discord';
export class BaseInteractionBuilder {
    interaction;
    user;
    guild;
    constructor({ interaction }) {
        this.interaction = interaction;
        if (interaction instanceof Message) {
            this.user = interaction.author;
            this.guild = interaction.guild;
        }
        else {
            this.user = interaction.user;
            this.guild = interaction.guild;
        }
    }
    get isDeferred() {
        if (this.interaction instanceof Message)
            return false;
        return this.interaction.deferred;
    }
    get isComponentInteraction() {
        return (this.interaction instanceof ButtonInteraction ||
            this.interaction instanceof StringSelectMenuInteraction);
    }
    async validateTextChannel(channelId) {
        const channel = await this.guild.channels.fetch(channelId);
        if (channel?.isTextBased() !== true) {
            await new DiscordError({ element: channelId, interaction: this.interaction }).notFound({ type: 'Channel' }).reply();
            return null;
        }
        return channel;
    }
    async handleInteractionResponse(content) {
        if (this.interaction instanceof Message)
            return;
        if (this.isComponentInteraction) {
            const componentInteraction = this.interaction;
            await componentInteraction.update(content);
            return;
        }
        if (this.isDeferred) {
            await this.interaction.editReply(content);
            return;
        }
        await this.interaction.reply(content);
    }
}
