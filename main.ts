import "https://deno.land/x/dotenv@v3.2.2/load.ts"
import * as Discord from "npm:discord.js"
import {
	defineSlashCommand,
	stringOption,
	useSlashCommands,
} from "./discord/slash-command.ts"

const client = new Discord.Client({
	intents: [Discord.GatewayIntentBits.Guilds],
})

client.on("ready", (client) => {
	console.info(`Logged in as ${client.user?.tag}`)
})

useSlashCommands(client, [
	defineSlashCommand({
		name: "echo",
		description: "Echoes your input",
		options: {
			input: stringOption("The input to echo"),
		},
		run: async (options, interaction) => {
			await interaction.reply(options.input)
		},
	}),
])

await client.login(Deno.env.get("DISCORD_BOT_TOKEN"))
