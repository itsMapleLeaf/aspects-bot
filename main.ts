import "https://deno.land/x/dotenv@v3.2.2/load.ts"
import chalk from "npm:chalk"
import * as Discord from "npm:discord.js"
import { rollCommand } from "./commands/roll.ts"
import { useSlashCommands } from "./discord/slash-command.ts"

const client = new Discord.Client({
	intents: [Discord.GatewayIntentBits.Guilds],
})

client.on("ready", (client) => {
	console.info(chalk.gray`Logged in as`, chalk.bold(client.user?.tag))
})

useSlashCommands(client, [
	rollCommand,
])

await client.login(Deno.env.get("DISCORD_BOT_TOKEN"))
