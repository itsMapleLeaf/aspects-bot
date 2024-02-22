import * as Discord from "discord.js"
import { Command } from "./command-handler.ts"
import {
	SlashCommandOption,
	SlashCommandOptionValues,
} from "./slash-command-option.ts"

type DiscordSlashCommandOptionData = Exclude<
	Discord.ApplicationCommandOptionData,
	| Discord.ApplicationCommandSubCommandData
	| Discord.ApplicationCommandSubGroupData
>

interface SlashCommandData extends Discord.ChatInputApplicationCommandData {
	options: readonly DiscordSlashCommandOptionData[]
}

export interface SlashCommand extends Command {
	type: "slash"
	data: SlashCommandData
	run: (interaction: Discord.ChatInputCommandInteraction) => Promise<void>
}

type SlashCommandArgs<Options extends Record<string, SlashCommandOption>> = {
	name: string
	description: string
	options: Options
	run: (
		interaction: Discord.ChatInputCommandInteraction,
		options: SlashCommandOptionValues<Options>,
	) => Promise<void>
}

export function defineSlashCommand<
	Options extends Record<string, SlashCommandOption>,
>(args: SlashCommandArgs<Options>): SlashCommand {
	async function run(interaction: Discord.ChatInputCommandInteraction) {
		const values: Record<string, unknown> = {}
		for (const [name, option] of Object.entries(args.options)) {
			values[name] = option.getValue(
				name,
				interaction,
				option.required ?? false,
			)
		}
		await args.run(interaction, values as SlashCommandOptionValues<Options>)
	}

	return {
		type: "slash",
		run,
		data: {
			name: args.name,
			description: args.description,
			options: Object.entries(args.options).map(
				([name, option]) =>
					({
						...option.data,
						name,
						description: option.description,
						type: option.type,
						required: option.required ?? false,
						autocomplete: !!option.autocomplete,
					} as DiscordSlashCommandOptionData),
			),
		},
		match: (interaction) => {
			if (
				interaction.isChatInputCommand() &&
				interaction.commandName === args.name
			) {
				return {
					name: args.name,
					async run() {
						await run(interaction)
					},
				}
			}

			if (
				interaction.isAutocomplete() &&
				interaction.commandName === args.name
			) {
				const focused = interaction.options.getFocused(true)
				const option = args.options[focused.name]
				return {
					name: `autocomplete(${args.name}:${focused})`,
					async run() {
						const choices = await option.autocomplete?.(focused.value)
						await interaction.respond(choices?.slice(0, 25) ?? [])
					},
				}
			}
		},
	}
}

export interface SlashCommandGroup extends Command {}

export function defineSlashCommandGroup(
	name: string,
	description: string,
	items: SlashCommand[],
): SlashCommandGroup {
	return {
		data: {
			name,
			description,
			options: items.map((item) => {
				return {
					...item.data,
					type: Discord.ApplicationCommandOptionType.Subcommand,
				}
			}),
		},
		match: (interaction) => {
			if (
				interaction.isChatInputCommand() &&
				interaction.commandName === name
			) {
				const command = items.find(
					(item) => item.data.name === interaction.options.getSubcommand(),
				)
				if (command) {
					return {
						name: `${name} ${command.data.name}`,
						async run() {
							await command.run(interaction)
						},
					}
				}
			}
		},
	}
}
