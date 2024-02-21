import * as Discord from "npm:discord.js"
import { charactersCommand } from "./characters/characters-command.ts"
import { rollCommand } from "./dice/roll-command.ts"
import { useSlashCommands } from "./discord/slash-command.ts"
import { env } from "./env.ts"
import { Logger } from "./logger.ts"

const client = new Discord.Client({
	intents: [
		Discord.GatewayIntentBits.Guilds,
		Discord.GatewayIntentBits.GuildMembers,
	],
})

client.on("ready", (client) => {
	Logger.info`Logged in as ${client.user?.tag}`
})

useSlashCommands(client, [
	rollCommand,
	charactersCommand,
])

await client.login(env.DISCORD_BOT_TOKEN)
