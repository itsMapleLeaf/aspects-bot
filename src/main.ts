import * as Discord from "discord.js"
import { useCharacterCommands } from "./characters/useCharacterCommands.js"
import { useCombatCommands } from "./combat/useCombatCommands.js"
import { useRollCommands } from "./dice/useRollCommands.js"
import { commandStore } from "./discord/commands/CommandStore.js"
import { messageComponentStore } from "./discord/messageComponents/MessageComponentStore.js"
import { env } from "./env.js"
import { Logger } from "./logger.js"

const client = new Discord.Client({
	intents: [Discord.GatewayIntentBits.Guilds, Discord.GatewayIntentBits.GuildMembers],
})

client.on("ready", (client) => {
	Logger.info((f) => `Logged in as ${f.highlight(client.user?.tag)} 💖`)
})

useRollCommands()
await useCharacterCommands()
useCombatCommands()

commandStore.addListeners(client)
messageComponentStore.addListeners(client)

await Logger.async("Logging in", () => client.login(env.DISCORD_BOT_TOKEN))
