import { DiscordEvent } from "@/discord/Event";

new DiscordEvent({
    name: 'messageCreate',
    run (message) {
        console.log(message.content)
    }
})