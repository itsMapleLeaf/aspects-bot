import * as Discord from "discord.js"
import { Awaitable, NonNullableWhen } from "../types.ts"
import { DiscordSlashCommandOptionData } from "./slash-command.ts"

export type SlashCommandOption = {
	required?: boolean
	getData(name: string): DiscordSlashCommandOptionData
	getValue(
		name: string,
		interaction: Discord.ChatInputCommandInteraction,
		required: boolean,
	): unknown
	autocomplete?: SlashCommandAutocompleteFn
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
		getData: (name) => ({
			...data,
			name,
			description,
			type: Discord.ApplicationCommandOptionType.String,
		}),
		getValue: (name, interaction, required) =>
			interaction.options.getString(name, required),
	}),
	number: (
		description: string,
		data?: Partial<Discord.ApplicationCommandNumericOptionData>,
	) => ({
		getData: (name) => ({
			...data,
			name,
			description,
			type: Discord.ApplicationCommandOptionType.Number,
		}),
		getValue: (name, interaction, required) =>
			interaction.options.getNumber(name, required),
	}),
	integer: (
		description: string,
		data?: Partial<Discord.ApplicationCommandNumericOptionData>,
	) => ({
		getData: (name) => ({
			...data,
			name,
			description,
			type: Discord.ApplicationCommandOptionType.Integer,
		}),
		getValue: (name, interaction, required) =>
			interaction.options.getInteger(name, required),
	}),
	boolean: (
		description: string,
		data?: Partial<Discord.ApplicationCommandBooleanOptionData>,
	) => ({
		getData: (name) => ({
			...data,
			name,
			description,
			type: Discord.ApplicationCommandOptionType.Boolean,
		}),
		getValue: (name, interaction, required) =>
			interaction.options.getBoolean(name, required),
	}),
	user: (
		description: string,
		data?: Partial<Discord.ApplicationCommandUserOptionData>,
	) => ({
		getData: (name) => ({
			...data,
			name,
			description,
			type: Discord.ApplicationCommandOptionType.User,
		}),
		getValue: (name, interaction, required) =>
			interaction.options.getUser(name, required),
	}),
	channel: (
		description: string,
		data?: Partial<Discord.ApplicationCommandChannelOptionData>,
	) => ({
		getData: (name) => ({
			...data,
			name,
			description,
			type: Discord.ApplicationCommandOptionType.Channel,
		}),
		getValue: (name, interaction, required) =>
			interaction.options.getChannel(name, required),
	}),
	role: (
		description: string,
		data?: Partial<Discord.ApplicationCommandRoleOptionData>,
	) => ({
		getData: (name) => ({
			...data,
			name,
			description,
			type: Discord.ApplicationCommandOptionType.Role,
		}),
		getValue: (name, interaction, required) =>
			interaction.options.getRole(name, required),
	}),
	mentionable: (
		description: string,
		data?: Partial<Discord.ApplicationCommandMentionableOptionData>,
	) => ({
		getData: (name) => ({
			...data,
			name,
			description,
			type: Discord.ApplicationCommandOptionType.Mentionable,
		}),
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
