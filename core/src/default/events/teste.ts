import { DiscordEvent } from "@/discord/Event";

new DiscordEvent({
    name: 'debug',
    run (message) {
        console.log(message)
    }
})