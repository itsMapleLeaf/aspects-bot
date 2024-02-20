import chalk from "npm:chalk"
import * as Discord from "npm:discord.js"
import { rollCommand } from "./commands/roll.ts"
import { useSlashCommands } from "./discord/slash-command.ts"
import { env } from "./env.ts"
import { loadGameData } from "./game-data.ts"

const client = new Discord.Client({
	intents: [Discord.GatewayIntentBits.Guilds],
})

client.on("ready", (client) => {
	console.info(chalk.gray`Logged in as`, chalk.bold(client.user?.tag))
})

useSlashCommands(client, [
	rollCommand,
])

console.info(chalk.gray`Loading game data...`)
await loadGameData()
console.info(chalk.green`Game data loaded`)

await client.login(env.DISCORD_BOT_TOKEN)
