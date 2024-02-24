import * as Discord from "discord.js"
import { Command, CommandTask } from "./command-handler.ts"
import {
	SlashCommandOption,
	SlashCommandOptionValues,
} from "./slash-command-option.ts"

export interface SlashCommand extends Command {
	type: "slash"
	data: SlashCommandData[]
	run: (interaction: Discord.ChatInputCommandInteraction) => Promise<void>
	autocomplete: (
		interaction: Discord.AutocompleteInteraction,
	) => CommandTask | undefined
}

export interface SlashCommandData
	extends Discord.ChatInputApplicationCommandData {
	options: readonly DiscordSlashCommandOptionData[]
}

export type DiscordSlashCommandOptionData = Exclude<
	Discord.ApplicationCommandOptionData,
	| Discord.ApplicationCommandSubCommandData
	| Discord.ApplicationCommandSubGroupData
>

export type SlashCommandArgs<
	Options extends Record<string, SlashCommandOption>,
> = {
	name: string
	description: string
	options: Options
	aliases?: string[]
	data?: Partial<SlashCommandData>
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

	function autocomplete(interaction: Discord.AutocompleteInteraction) {
		const focused = interaction.options.getFocused(true)
		const option = args.options[focused.name]
		return {
			name: `autocomplete(${args.name}:${focused.name})`,
			async run() {
				const choices = await option.autocomplete?.(focused.value.trim())
				await interaction.respond(choices ?? [])
			},
		}
	}

	const options = Object.entries(args.options).map(([name, option]) => {
		const data = {
			...option.getData(name),
			required: option.required ?? false,
		}

		switch (data.type) {
			case Discord.ApplicationCommandOptionType.String:
			case Discord.ApplicationCommandOptionType.Number:
			case Discord.ApplicationCommandOptionType.Integer: {
				return { ...data, autocomplete: !!option.autocomplete }
			}
			default: {
				return data
			}
		}
	})

	return {
		type: "slash",
		data: [args.name, ...(args.aliases ?? [])].map((name) => ({
			...args.data,
			name,
			description: args.description,
			options,
		})),
		run,
		autocomplete,
		match: (interaction) => {
			if (
				interaction.isChatInputCommand() &&
				(interaction.commandName === args.name ||
					args.aliases?.includes(interaction.commandName))
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
				(interaction.commandName === args.name ||
					args.aliases?.includes(interaction.commandName))
			) {
				return autocomplete(interaction)
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
	function findSubcommand(
		interaction:
			| Discord.ChatInputCommandInteraction
			| Discord.AutocompleteInteraction,
	) {
		const subcommandName = interaction.options.getSubcommand()
		return items.find((item) =>
			item.data.some((data) => data.name === subcommandName),
		)
	}

	return {
		data: {
			name,
			description,
			options: items.flatMap((item) => {
				return item.data.map((data) => ({
					...data,
					type: Discord.ApplicationCommandOptionType.Subcommand,
				}))
			}),
		},
		match: (interaction) => {
			if (
				interaction.isChatInputCommand() &&
				interaction.commandName === name
			) {
				const subcommand = findSubcommand(interaction)
				if (!subcommand) return

				return {
					name: `${name} ${interaction.options.getSubcommand()}`,
					async run() {
						await subcommand.run(interaction)
					},
				}
			}

			if (interaction.isAutocomplete() && interaction.commandName === name) {
				const subcommand = findSubcommand(interaction)
				return subcommand?.autocomplete?.(interaction)
			}
		},
	}
}
