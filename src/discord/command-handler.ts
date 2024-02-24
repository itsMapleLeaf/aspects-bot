import * as Discord from "discord.js"
import { Client } from "discord.js"
import { firstWhereReturning } from "../helpers/iterable.ts"
import { Logger } from "../logger.ts"
import { MaybeArray } from "../types.ts"
import { CommandError } from "./commands/CommandError.ts"

export type Command = {
	data: MaybeArray<Discord.ApplicationCommandData>
	match: (interaction: Discord.Interaction) => CommandTask | undefined
}

export type CommandTask = {
	name: string
	run: () => unknown
}

export function useCommands(client: Client, commands: Command[]) {
	client.on("ready", async (client) => {
		const commandEntries = commands.flatMap((c) => c.data)
		Logger.info`Using commands: ${commandEntries.map((c) => c.name).join(", ")}`
		await Logger.async("Registering commands", async () => {
			await client.application.commands.set(commandEntries)
		})
	})

	client.on("interactionCreate", async (interaction) => {
		const task = firstWhereReturning(commands, (c) => c.match(interaction))
		if (!task) return

		await Logger.async(`Running command "${task.name}"`, async () => {
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
