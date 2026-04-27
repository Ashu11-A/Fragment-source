import { registerCreatedCommand, registerCreatedEvent } from 'discord';
import { Package } from 'utils';
import pkg from '../package.json';
/** Obrigatório antes de `new Plugin()` em app.ts: o construtor lê metadata via Package.getData(). */
Package.setData(pkg);
/** Gerado automaticamente — não edite manualmente. */
export async function registerAll(ctx) {
    // Commands
    const { default: commands0 } = await import('./discord/commands/ticket.js');
    registerCreatedCommand(ctx, commands0);
    // Events
    const { default: events0 } = await import('./discord/events/messageDelete.js');
    registerCreatedEvent(ctx, events0);
    const { default: events1 } = await import('./discord/events/leaveVoiceChannel.js');
    registerCreatedEvent(ctx, events1);
    const { default: events2 } = await import('./discord/events/joinGuild.js');
    registerCreatedEvent(ctx, events2);
    const { default: events3 } = await import('./discord/events/messageCreate.js');
    registerCreatedEvent(ctx, events3);
}
