import "https://deno.land/x/dotenv@v3.2.2/load.ts"
import * as Discord from "npm:discord.js"
import {
	booleanOption,
	defineSlashCommand,
	optional,
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
	defineSlashCommand({
		name: "roll",
		description: "Roll some dice",
		options: {
			die: stringOption("The die to roll", [
				"1d4",
				"1d6",
				"1d8",
				"1d12",
				"1d20",
			]),
			private: optional(booleanOption("Only you can see this.")),
		},
		run: async (options, interaction) => {
			const result = Math.floor(
				Math.random() * parseInt(options.die.split("d")[1]) + 1,
			)
			await interaction.reply({
				content: `🎲 ${options.die} -> **${result}**`,
				ephemeral: options.private ?? false,
			})
		},
	}),
])

await client.login(Deno.env.get("DISCORD_BOT_TOKEN"))
