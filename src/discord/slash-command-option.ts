import * as Discord from "discord.js"
import { Awaitable, NonNullableWhen } from "../types.ts"

export type SlashCommandOption = {
	type: Discord.ApplicationCommandOptionType
	description: string
	required?: boolean
	data?: Partial<Discord.ApplicationCommandOptionData>
	autocomplete?: SlashCommandAutocompleteFn
	getValue(
		name: string,
		interaction: Discord.ChatInputCommandInteraction,
		required: boolean,
	): unknown
}

export type SlashCommandAutocompleteFn = (
	input: string,
) => Awaitable<Discord.ApplicationCommandOptionChoiceData[]>

export type SlashCommandOptionValues<
	Options extends Record<string, SlashCommandOption>,
> = {
	[K in keyof Options]: NonNullableWhen<
		Options[K]["required"],
		ReturnType<Options[K]["getValue"]>
	>
}

export const optionTypes = {
	string: (
		description: string,
		data?: Partial<Discord.ApplicationCommandStringOptionData>,
	) => ({
		type: Discord.ApplicationCommandOptionType.String,
		description,
		data,
		getValue: (name, interaction, required) =>
			interaction.options.getString(name, required),
	}),
	number: (
		description: string,
		data?: Partial<Discord.ApplicationCommandNumericOptionData>,
	) => ({
		type: Discord.ApplicationCommandOptionType.Number,
		description,
		data,
		getValue: (name, interaction, required) =>
			interaction.options.getNumber(name, required),
	}),
	integer: (
		description: string,
		data?: Partial<Discord.ApplicationCommandNumericOptionData>,
	) => ({
		type: Discord.ApplicationCommandOptionType.Integer,
		description,
		data,
		getValue: (name, interaction, required) =>
			interaction.options.getInteger(name, required),
	}),
	boolean: (
		description: string,
		data?: Partial<Discord.ApplicationCommandBooleanOptionData>,
	) => ({
		type: Discord.ApplicationCommandOptionType.Boolean,
		description,
		data,
		getValue: (name, interaction, required) =>
			interaction.options.getBoolean(name, required),
	}),
	user: (
		description: string,
		data?: Partial<Discord.ApplicationCommandUserOptionData>,
	) => ({
		type: Discord.ApplicationCommandOptionType.User,
		description,
		data,
		getValue: (name, interaction, required) =>
			interaction.options.getUser(name, required),
	}),
	channel: (
		description: string,
		data?: Partial<Discord.ApplicationCommandChannelOptionData>,
	) => ({
		type: Discord.ApplicationCommandOptionType.Channel,
		description,
		data,
		getValue: (name, interaction, required) =>
			interaction.options.getChannel(name, required),
	}),
	role: (
		description: string,
		data?: Partial<Discord.ApplicationCommandRoleOptionData>,
	) => ({
		type: Discord.ApplicationCommandOptionType.Role,
		description,
		data,
		getValue: (name, interaction, required) =>
			interaction.options.getRole(name, required),
	}),
	mentionable: (
		description: string,
		data?: Partial<Discord.ApplicationCommandMentionableOptionData>,
	) => ({
		type: Discord.ApplicationCommandOptionType.Mentionable,
		description,
		data,
		getValue: (name, interaction, required) =>
			interaction.options.getMentionable(name, required),
	}),

	required: <T extends SlashCommandOption>(option: T) => ({
		...option,
		required: true,
	}),
	optional: <T extends SlashCommandOption>(option: T) => ({
		...option,
		required: false,
	}),

	autocomplete: <T extends SlashCommandOption>(
		option: T,
		autocomplete: SlashCommandAutocompleteFn,
	) => ({
		...option,
		autocomplete,
	}),
} as const satisfies Record<string, (...args: any[]) => SlashCommandOption>
