import chalk from "npm:chalk"
import * as Discord from "npm:discord.js"
import { charactersCommand } from "./commands/characters.ts"
import { rollCommand } from "./commands/roll.ts"
import { useSlashCommands } from "./discord/slash-command.ts"
import { env } from "./env.ts"

const client = new Discord.Client({
	intents: [
		Discord.GatewayIntentBits.Guilds,
		Discord.GatewayIntentBits.GuildMembers,
	],
})

client.on("ready", (client) => {
	console.info(chalk.gray`Logged in as`, chalk.bold(client.user?.tag))
})

useSlashCommands(client, [
	rollCommand,
	charactersCommand,
])

await client.login(env.DISCORD_BOT_TOKEN)
