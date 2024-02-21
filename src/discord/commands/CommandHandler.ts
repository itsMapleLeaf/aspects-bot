import * as Discord from "discord.js"
import { Logger } from "../../logger.ts"
import { Command } from "./Command.ts"
import { CommandError } from "./CommandError.ts"

export class CommandHandler {
	#commands: Command[]

	constructor(commands: Command[]) {
		this.#commands = commands
	}

	addListeners(client: Discord.Client) {
		client.on("ready", async (client) => {
			await Logger.async("Registering slash commands", () =>
				client.application.commands.set(
					this.#commands.map((command) => command.data),
				),
			)
		})

		client.on("interactionCreate", async (interaction) => {
			if (!interaction.isCommand()) return

			const result = this.findMatchingCommand(interaction)
			if (!result) return

			await Logger.async(`Running command ${result.name}`, async () => {
				await Promise.resolve(result.run()).catch((error) => {
					if (error instanceof CommandError) {
						return addInteractionReply(interaction, {
							content: error.message,
							ephemeral: true,
						})
					}
					throw error
				})
			})
		})
	}

	private findMatchingCommand(interaction: Discord.CommandInteraction) {
		for (const command of this.#commands) {
			const result = command.match(interaction)
			if (result) return result
		}
	}
}

async function addInteractionReply(
	interaction: Discord.CommandInteraction,
	options: Discord.InteractionReplyOptions,
) {
	if (interaction.deferred) {
		await interaction.editReply(options)
	} else if (interaction.replied) {
		await interaction.followUp(options)
	} else {
		await interaction.reply(options)
	}
}
