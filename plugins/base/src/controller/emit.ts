import { DiscordComponent } from "@/discord/Components";
import { DiscordEvent } from "@/discord/Event";
import { SocketClient } from "./socket";
import { DiscordCommand } from "@/discord/Commands";
import { metadata } from "..";

export class Emit {
    private readonly client
    constructor () {
        this.client = SocketClient.client
    }
    
    async ready () { this.client.emit('metadata', await metadata()) }
    commands () { this.client.emit('commands', DiscordCommand.all) }
    components () { this.client.emit('components', DiscordComponent.all) }
    events () { this.client.emit('events', DiscordEvent.all) }
}