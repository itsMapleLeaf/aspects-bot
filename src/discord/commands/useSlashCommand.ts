import * as Discord from "discord.js"
import type { Override, Simplify, StrictOmit } from "../../types.js"
import { commandStore, type CommandReply, type SlashCommand } from "./CommandStore.js"

export function useSlashCommand<Options extends OptionRecord>(args: SlashCommandArgs<Options>) {
	return commandStore.addCommand(defineSlashCommand<Options>(args))
}

export type SlashCommandArgs<Options extends OptionRecord> = Override<
	StrictOmit<Discord.ChatInputApplicationCommandData, "type">,
	{
		group?: string
		options?: (t: typeof optionTypes) => Options
		run: (args: {
			interaction: Discord.ChatInputCommandInteraction
			options: OptionValues<Options>
		}) => Promise<CommandReply>
	}
>

export function defineSlashCommand<Options extends OptionRecord>(
	args: SlashCommandArgs<Options>,
): SlashCommand {
	const options = args.options?.(optionTypes)

	for (const [name, option] of Object.entries(options ?? {})) {
		if (option.autocomplete) {
			commandStore.addAutocompletion(args.name, name, {
				autocomplete: option.autocomplete,
			})
		}
	}

	return {
		data: {
			...args,
			options: Object.entries(options ?? {}).map(([name, option]) => option.data(name)),
		},
		async run(interaction) {
			const values: Record<string, unknown> = {}
			for (const [name, option] of Object.entries(options ?? {})) {
				values[name] = option.parse(interaction, name)
			}
			return await args.run({
				interaction,
				options: values as OptionValues<Options>,
			})
		},
	}
}

export type Option = {
	data: (name: string) => Discord.ApplicationCommandOptionData
	parse: (interaction: Discord.ChatInputCommandInteraction, name: string) => unknown
	autocomplete?: AutocompleteFn
}

export type OptionRecord = Record<string, Option>

export type OptionValues<Options extends Record<string, Option>> = Simplify<{
	[K in keyof Options]: ReturnType<Options[K]["parse"]>
}>

type AutocompleteFn<T extends string | number = string | number> = (
	interaction: Discord.AutocompleteInteraction,
) => Promise<Discord.ApplicationCommandOptionChoiceData<T>[]>

type RequiredType<Condition, T> = Condition extends true ? NonNullable<T> : T | null

export const optionTypes = {
	string<const Required extends boolean, const Value extends string>(
		description: string,
		data?: Override<
			Partial<Discord.ApplicationCommandStringOptionData>,
			{
				required?: Required
				choices?: readonly Discord.ApplicationCommandOptionChoiceData<Value>[]
				autocomplete?: AutocompleteFn
			}
		>,
	) {
		return {
			data: (name) => ({
				...data,
				name,
				type: Discord.ApplicationCommandOptionType.String,
				description,
				autocomplete: !!data?.autocomplete,
			}),
			parse(interaction, name) {
				return interaction.options.getString(name, data?.required) as RequiredType<Required, Value>
			},
			autocomplete: data?.autocomplete,
		} satisfies Option
	},

	integer<const Required extends boolean, const Value extends number>(
		description: string,
		data?: Override<
			Partial<Discord.ApplicationCommandNumericOptionData>,
			{
				required?: Required
				choices?: readonly Discord.ApplicationCommandOptionChoiceData<Value>[]
				autocomplete?: AutocompleteFn
			}
		>,
	) {
		return {
			data: (name) => ({
				...data,
				name,
				type: Discord.ApplicationCommandOptionType.Integer,
				description,
				autocomplete: !!data?.autocomplete,
			}),
			parse(interaction, name) {
				return interaction.options.getInteger(name, data?.required) as RequiredType<Required, Value>
			},
			autocomplete: data?.autocomplete,
		} satisfies Option
	},

	number<const Required extends boolean, const Value extends number>(
		description: string,
		data?: Override<
			Partial<Discord.ApplicationCommandNumericOptionData>,
			{
				required?: Required
				choices?: readonly Discord.ApplicationCommandOptionChoiceData<Value>[]
				autocomplete?: AutocompleteFn
			}
		>,
	) {
		return {
			data: (name) => ({
				...data,
				name,
				type: Discord.ApplicationCommandOptionType.Number,
				description,
				autocomplete: !!data?.autocomplete,
			}),
			parse(interaction, name) {
				return interaction.options.getNumber(name, data?.required) as RequiredType<Required, Value>
			},
			autocomplete: data?.autocomplete,
		} satisfies Option
	},

	boolean<const Required extends boolean>(
		description: string,
		data?: Override<
			Partial<Discord.ApplicationCommandBooleanOptionData>,
			{
				required?: Required
			}
		>,
	) {
		return {
			data: (name) => ({
				...data,
				name,
				type: Discord.ApplicationCommandOptionType.Boolean,
				description,
			}),
			parse(interaction, name) {
				return interaction.options.getBoolean(name, data?.required) as RequiredType<
					Required,
					boolean
				>
			},
		} satisfies Option
	},

	user<const Required extends boolean>(
		description: string,
		data?: Override<
			Partial<Discord.ApplicationCommandUserOptionData>,
			{
				required?: Required
			}
		>,
	) {
		return {
			data: (name) => ({
				...data,
				name,
				type: Discord.ApplicationCommandOptionType.User,
				description,
			}),
			parse(interaction, name) {
				return interaction.options.getUser(name, data?.required) as RequiredType<
					Required,
					Discord.User
				>
			},
		} satisfies Option
	},

	channel<const Required extends boolean>(
		description: string,
		data?: Override<
			Partial<Discord.ApplicationCommandChannelOptionData>,
			{
				required?: Required
			}
		>,
	) {
		return {
			data: (name) => ({
				...data,
				name,
				type: Discord.ApplicationCommandOptionType.Channel,
				description,
			}),
			parse(interaction, name) {
				return interaction.options.getChannel(name, data?.required) as RequiredType<
					Required,
					Discord.Channel
				>
			},
		} satisfies Option
	},

	role<const Required extends boolean>(
		description: string,
		data?: Override<
			Partial<Discord.ApplicationCommandRoleOptionData>,
			{
				required?: Required
			}
		>,
	) {
		return {
			data: (name) => ({
				...data,
				name,
				type: Discord.ApplicationCommandOptionType.Role,
				description,
			}),
			parse(interaction, name) {
				return interaction.options.getRole(name, data?.required) as RequiredType<
					Required,
					Discord.Role
				>
			},
		} satisfies Option
	},

	mentionable<const Required extends boolean>(
		description: string,
		data?: Override<
			Partial<Discord.ApplicationCommandMentionableOptionData>,
			{
				required?: Required
			}
		>,
	) {
		return {
			data: (name) => ({
				...data,
				name,
				type: Discord.ApplicationCommandOptionType.Mentionable,
				description,
			}),
			parse(interaction, name) {
				return interaction.options.getMentionable(name, data?.required) as RequiredType<
					Required,
					Discord.User | Discord.Channel | Discord.Role
				>
			},
		} satisfies Option
	},
}
