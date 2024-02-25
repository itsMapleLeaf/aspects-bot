import * as Discord from "discord.js"
import { characterCommands } from "./characters/characterCommands.ts"
import { combatCommands } from "./combat/combatCommands.ts"
import { participantSelector } from "./combat/participantSelector.ts"
import { rollCommand } from "./dice/roll-command.ts"
import { useCommands } from "./discord/command-handler.ts"
import { useMessageComponents } from "./discord/message-component-renderer.ts"
import { env } from "./env.ts"
import { Logger } from "./logger.ts"

const client = new Discord.Client({
	intents: [
		Discord.GatewayIntentBits.Guilds,
		Discord.GatewayIntentBits.GuildMembers,
	],
})

client.on("ready", (client) => {
	Logger.info((f) => `Logged in as ${f.highlight(client.user?.tag)}`)
})

useCommands(client, [rollCommand, ...characterCommands, ...combatCommands])
useMessageComponents(client, [participantSelector])

await Logger.async("Logging in", () => client.login(env.DISCORD_BOT_TOKEN))
