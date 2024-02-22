import * as Discord from "discord.js"
import { Client } from "discord.js"
import { Logger } from "../logger.ts"
import { CommandError } from "./commands/CommandError.ts"

export type Command = {
	data: Discord.ApplicationCommandData
	match: (interaction: Discord.Interaction) => CommandTask | undefined
}

export type CommandTask = {
	name: string
	run: () => unknown
}

export function useCommands(client: Client, commands: Command[]) {
	client.on("ready", async (client) => {
		await Logger.async("Registering commands", async () => {
			await client.application.commands.set(commands.map((c) => c.data))
		})
	})

	client.on("interactionCreate", async (interaction) => {
		for (const command of commands) {
			const task = command.match(interaction)
			if (task) {
				await Logger.async(`Running command: ${task.name}`, async () => {
					try {
						await task.run()
					} catch (error) {
						if (error instanceof CommandError && interaction.isRepliable()) {
							return await addInteractionReply(interaction, {
								content: error.message,
								ephemeral: true,
							})
						}
						throw error
					}
				})
				return
			}
		}
	})
}

async function addInteractionReply(
	interaction: Discord.RepliableInteraction,
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
