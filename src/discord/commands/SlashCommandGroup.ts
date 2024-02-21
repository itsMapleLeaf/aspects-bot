import * as Discord from "discord.js"
import { Command } from "./Command.ts"
import { SlashCommand } from "./SlashCommand.ts"

export class SlashCommandGroup implements Command {
	#name: string
	#description: string
	#commands: SlashCommand[]

	constructor(name: string, description: string, commands: SlashCommand[]) {
		this.#name = name
		this.#description = description
		this.#commands = commands
	}

	get data(): Discord.ApplicationCommandData {
		return {
			name: this.#name,
			description: this.#description,
			options: this.#commands.map((command) => ({
				...command.data,
				type: Discord.ApplicationCommandOptionType.Subcommand,
			})),
		}
	}

	async handleInteraction(interaction: Discord.Interaction): Promise<boolean> {
		if (!interaction.isChatInputCommand()) return false
		if (interaction.commandName !== this.#name) return false

		const command = this.#commands.find(
			(command) => interaction.options.getSubcommand() === command.data.name,
		)
		if (!command) return false

		await command.run(interaction)

		return true
	}
}
