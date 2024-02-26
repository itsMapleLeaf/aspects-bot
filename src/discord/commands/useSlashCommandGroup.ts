import * as Discord from "discord.js"
import { Logger } from "../../logger.ts"
import { SlashCommand, SlashCommandContext } from "./SlashCommandContext.ts"
import {
	OptionRecord,
	SlashCommandArgs,
	defineSlashCommand,
} from "./useSlashCommand.ts"

export function useSlashCommandGroup(name: string, description: string) {
	const context = SlashCommandContext.use()
	const commands = new Map<string, SlashCommand>()

	context.addCommand({
		get data() {
			return {
				name,
				description,
				options: [...getCommands()],
			}
		},
		run: async (interaction) => {
			const command = commands.get(interaction.options.getSubcommand())
			if (!command) {
				Logger.error((f) => {
					return `Command ${f.highlight(interaction.commandName)} has no subcommand ${f.highlight(interaction.options.getSubcommand())}`
				})
				return
			}
			await command.run(interaction)
		},
	})

	function* getCommands() {
		for (const command of commands.values()) {
			if (
				command.data.type !== Discord.ApplicationCommandType.ChatInput &&
				command.data.type !== undefined
			) {
				Logger.warn(
					`Command "${command.data.name}" is not a slash command. It will be ignored.`,
				)
				continue
			}

			yield {
				...command.data,
				type: Discord.ApplicationCommandOptionType.Subcommand as const,
				options: [
					...getSubcommandOptions(
						command.data.name,
						command.data.options ?? [],
					),
				],
			}
		}
	}

	function* getSubcommandOptions(
		name: string,
		options: readonly Discord.ApplicationCommandOptionData[],
	) {
		for (const option of options ?? []) {
			if (
				option.type !== Discord.ApplicationCommandOptionType.Subcommand &&
				option.type !== Discord.ApplicationCommandOptionType.SubcommandGroup
			) {
				yield option
				continue
			}

			Logger.warn((f) => {
				return (
					`Found subcommand or subcommand group ${f.highlight(option.name)} in command ${f.highlight(name)}. ` +
					`It will be ignored.`
				)
			})
		}
	}

	return {
		add<Options extends OptionRecord>(args: SlashCommandArgs<Options>) {
			commands.set(args.name, defineSlashCommand(args, context))
		},
	}
}
