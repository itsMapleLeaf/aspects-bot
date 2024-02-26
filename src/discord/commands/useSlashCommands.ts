import * as Discord from "discord.js"

type SlashCommand = {
	data: (name: string) => Discord.ApplicationCommandData
	run: (args: {
		interaction:
			| Discord.ChatInputCommandInteraction
			| Discord.AutocompleteInteraction
	}) => Promise<void>
}

export type SlashCommandStore = ReturnType<typeof useSlashCommands>

export function useSlashCommands(client: Discord.Client) {
	const commands = new Map<string, SlashCommand>()

	client.on("ready", async (client) => {
		await client.application.commands.set(
			[...commands].map(([name, command]) => command.data(name)),
		)
	})

	client.on("interactionCreate", async (interaction) => {
		if (!interaction.isChatInputCommand()) return
		const command = commands.get(interaction.commandName)
		await command?.run({ interaction })
	})

	return { commands }
}
