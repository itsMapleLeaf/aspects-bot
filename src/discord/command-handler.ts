import * as Discord from "discord.js"
import { Client } from "discord.js"
import { inspect } from "node:util"
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
	client.on("ready", (client) => {
		const data = commands.flatMap((c) => c.data)
		Logger.info((f) => {
			const names = data
				.flatMap((command) => {
					if (
						command.type !== Discord.ApplicationCommandType.ChatInput &&
						command.type !== undefined
					) {
						return f.highlight(command.name)
					}

					const subcommandNames =
						command.options?.flatMap((option) => {
							if (
								option.type === Discord.ApplicationCommandOptionType.Subcommand
							) {
								return option.name
							}
							if (
								option.type ===
								Discord.ApplicationCommandOptionType.SubcommandGroup
							) {
								return option.options.map((subcommand) => subcommand.name)
							}
							return []
						}) ?? []

					if (subcommandNames.length === 0) {
						return command.name
					}

					return subcommandNames.map((subcommandName) => {
						return `${f.highlight(command.name)} ${f.base(subcommandName)}`
					})
				})
				.map((name) => `/${f.highlight(name)}`)
			return `Using commands: ${names.join(", ")}`
		})
		Logger.async("Registering commands", async () => {
			await client.application.commands.set(data)
		})
	})

	client.on("interactionCreate", (interaction) => {
		const task = firstWhereReturning(commands, (c) => c.match(interaction))
		if (!task) return

		Logger.async(
			(f) => f.base(`Running ${f.highlight(task.name)} command`),
			async () => {
				try {
					await task.run()
				} catch (error) {
					Logger.error(inspect(error, { depth: 10 }))
					if (interaction.isRepliable()) {
						const message =
							(error instanceof CommandError && error.message) ||
							"Sorry, something went wrong. Try again?"

						await addInteractionReply(interaction, {
							content: message,
							ephemeral: true,
						})
					}
				}
			},
		)
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
