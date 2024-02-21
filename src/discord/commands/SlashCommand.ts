import * as Discord from "npm:discord.js"
import { Command } from "./Command.ts"

export type SlashCommandConfig<Values> = {
	name: string
	description: string
	options?: {
		[K in keyof Values]: SlashCommandOption<Values[K]>
	}
	data?: StrictOmit<Discord.ChatInputApplicationCommandData, "options"> & {
		options?: readonly CommandGroupCompatibleOptionsData[]
	}
	run: (
		options: Values,
		interaction: Discord.ChatInputCommandInteraction,
	) => Promise<void>
}

type CommandGroupCompatibleOptionsData = Exclude<
	Discord.ApplicationCommandOptionData,
	| Discord.ApplicationCommandSubCommandData
	| Discord.ApplicationCommandSubGroupData
>

type SlashCommandOptionData =
	& StrictOmit<
		CommandGroupCompatibleOptionsData,
		"name" | "required" | "autocomplete"
	>
	& {
		required?: boolean
	}

type SlashCommandOption<T = unknown> = {
	data: SlashCommandOptionData
	getValue: (
		name: string,
		interaction: Discord.ChatInputCommandInteraction,
	) => T
}

type SlashCommandConfigInternal = {
	name: string
	description: string
	data: StrictOmit<Discord.ChatInputApplicationCommandData, "options"> & {
		options?: readonly CommandGroupCompatibleOptionsData[]
	}
	run: (interaction: Discord.ChatInputCommandInteraction) => Promise<void>
}

export class SlashCommand implements Command {
	#config: SlashCommandConfigInternal

	private constructor(config: SlashCommandConfigInternal) {
		this.#config = config
	}

	static create<Values extends Record<string, unknown>>({
		options,
		...config
	}: SlashCommandConfig<Values>) {
		return new SlashCommand({
			...config,
			data: {
				...config.data,
				name: config.name,
				description: config.description,
				...(options && {
					options: Object.entries<SlashCommandOption<unknown>>(options).map((
						[name, option],
					) => ({
						...option.data,
						name,
					})),
				}),
			},
			async run(interaction) {
				const values: Record<string, unknown> = {}
				for (
					const [name, option] of Object.entries<SlashCommandOption<unknown>>(
						options ?? {},
					)
				) {
					values[name] = option.getValue(name, interaction)
				}
				await config.run(values as Values, interaction)
			},
		})
	}

	static #createOptionFactory<
		Type extends Discord.ApplicationCommandOptionType,
		Value,
	>({
		type,
		getValue,
	}: {
		type: Type
		getValue: SlashCommandOption<Value | null>["getValue"]
	}) {
		function createOption(
			description: string,
			data?: Partial<Extract<SlashCommandOptionData, { type: Type }>>,
		): SlashCommandOption<Value> {
			return {
				data: {
					...data,
					type,
					description,
					required: true,
				} as SlashCommandOptionData,
				getValue(name, interaction) {
					const value = getValue(name, interaction)
					if (value === null) {
						throw new Error(`Missing required option ${name}`)
					}
					return value
				},
			}
		}

		createOption.optional = function createOptionalOption(
			description: string,
			data?: Partial<Extract<SlashCommandOptionData, { type: Type }>>,
		): SlashCommandOption<Value | null> {
			return {
				data: {
					...data,
					type,
					description,
					required: false,
				} as SlashCommandOptionData,
				getValue,
			}
		}

		return createOption
	}

	static string = SlashCommand.#createOptionFactory({
		type: Discord.ApplicationCommandOptionType.String,
		getValue(name, interaction) {
			return interaction.options.getString(name)
		},
	})

	static number = SlashCommand.#createOptionFactory({
		type: Discord.ApplicationCommandOptionType.Number,
		getValue(name, interaction) {
			return interaction.options.getNumber(name)
		},
	})

	static integer = SlashCommand.#createOptionFactory({
		type: Discord.ApplicationCommandOptionType.Integer,
		getValue(name, interaction) {
			return interaction.options.getInteger(name)
		},
	})

	static boolean = SlashCommand.#createOptionFactory({
		type: Discord.ApplicationCommandOptionType.Boolean,
		getValue(name, interaction) {
			return interaction.options.getBoolean(name)
		},
	})

	static user = SlashCommand.#createOptionFactory({
		type: Discord.ApplicationCommandOptionType.User,
		getValue(name, interaction) {
			return interaction.options.getUser(name)
		},
	})

	static channel = SlashCommand.#createOptionFactory({
		type: Discord.ApplicationCommandOptionType.Channel,
		getValue(name, interaction) {
			return interaction.options.getChannel(name)
		},
	})

	static role = SlashCommand.#createOptionFactory({
		type: Discord.ApplicationCommandOptionType.Role,
		getValue(name, interaction) {
			return interaction.options.getRole(name)
		},
	})

	static mentionable = SlashCommand.#createOptionFactory({
		type: Discord.ApplicationCommandOptionType.Mentionable,
		getValue(name, interaction) {
			return interaction.options.getMentionable(name)
		},
	})

	get data() {
		return {
			...this.#config.data,
			name: this.#config.name,
			description: this.#config.description,
		}
	}

	async run(interaction: Discord.ChatInputCommandInteraction) {
		await this.#config.run(interaction)
	}

	async handleInteraction(interaction: Discord.Interaction) {
		if (!interaction.isChatInputCommand()) return false
		if (interaction.commandName !== this.#config.name) return false
		await this.run(interaction)
		return true
	}
}

type StrictOmit<T, K extends AllKeys<T>> = T extends unknown ? Omit<T, K>
	: never
type AllKeys<T> = T extends unknown ? keyof T : never
