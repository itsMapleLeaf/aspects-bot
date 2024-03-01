import * as Discord from "discord.js"
import { useCharacterCommands } from "./characters/useCharacterCommands.ts"
import { useCombatCommands } from "./combat/useCombatCommands.ts"
import { useRollCommands } from "./dice/useRollCommands.ts"
import { commandStore } from "./discord/commands/CommandStore.ts"
import { messageComponentStore } from "./discord/messageComponents/MessageComponentStore.ts"
import { env } from "./env.ts"
import { Logger } from "./logger.ts"

const client = new Discord.Client({
	intents: [Discord.GatewayIntentBits.Guilds, Discord.GatewayIntentBits.GuildMembers],
})

client.on("ready", (client) => {
	Logger.info((f) => `Logged in as ${f.highlight(client.user?.tag)}`)
})

useRollCommands()
await useCharacterCommands()
useCombatCommands()

commandStore.addListeners(client)
messageComponentStore.addListeners(client)

await Logger.async("Logging in", () => client.login(env.DISCORD_BOT_TOKEN))
