import chalk from "npm:chalk"
import * as Discord from "npm:discord.js"
import prettyMs from "npm:pretty-ms"
import { callTimedAsync } from "../helpers/call-timed.ts"
import { Awaitable, NonNullableWhen } from "../types.ts"

export type SlashCommand = {
	options: Record<string, SlashCommandOption>
	getData: () => Discord.ApplicationCommandData
	run: (interaction: Discord.ChatInputCommandInteraction) => unknown
}

type OptionData = Exclude<
	Discord.ApplicationCommandOptionData,
	| Discord.ApplicationCommandSubCommandData
	| Discord.ApplicationCommandSubGroupData
>

export type SlashCommandOption = {
	getData: (
		name: string,
	) => OptionData
	getValue: (
		name: string,
		interaction: Discord.ChatInputCommandInteraction,
	) => unknown
	getAutocompleteChoices?: (
		interaction: Discord.AutocompleteInteraction,
	) => Awaitable<Discord.ApplicationCommandOptionChoiceData[]>
}

type SlashCommandOptionValues<
	Options extends Record<string, SlashCommandOption>,
> = {
	[K in keyof Options]: NonNullableWhen<
		ReturnType<Options[K]["getData"]>["required"],
		Awaited<ReturnType<Options[K]["getValue"]>>
	>
}

export function useSlashCommands(
	client: Discord.Client,
	commands: SlashCommand[],
) {
	client.on("ready", async (client) => {
		try {
			const [time] = await callTimedAsync(async function setCommands() {
				await client.application.commands.set(
					commands.map((command) => command.getData()),
				)
			})
			console.info(
				chalk.gray(
					`Registered ${
						chalk.white(chalk.bold(commands.length))
					} slash command(s) in ${chalk.green(prettyMs(time))}`,
				),
			)
		} catch (error) {
			console.error(chalk.red`Failed to register slash commands.`, error)
		}
	})

	client.on("interactionCreate", async (interaction) => {
		if (interaction.isChatInputCommand()) {
			const command = commands.find((c) =>
				c.getData().name === interaction.commandName
			)

			try {
				await command?.run(interaction)
			} catch (error) {
				console.error(`Failed running command:`, error, {
					command: command?.getData(),
					interaction: interaction.toJSON(),
				})

				try {
					const options = {
						content: `Sorry, something went wrong. Try again?`,
						ephemeral: true,
					}
					if (interaction.deferred) {
						await interaction.editReply(options)
					} else if (interaction.replied) {
						await interaction.followUp(options)
					} else {
						await interaction.reply(options)
					}
				} catch (error) {
					console.error(`Failed to reply to interaction:`, error)
				}
			}
		}

		if (interaction.isAutocomplete()) {
			const command = commands.find((c) =>
				c.getData().name === interaction.commandName
			)
			if (command) {
				for (const [name, option] of Object.entries(command.options)) {
					if (name === interaction.options.getFocused()) {
						const choices = await option.getAutocompleteChoices?.(interaction)
						if (choices) {
							await interaction.respond(choices)
							continue
						}
					}
				}
			}
		}
	})
}

export function defineSlashCommand<
	const Options extends Record<string, SlashCommandOption>,
>({ options, run, ...args }: {
	name: string
	description: string
	options: Options
	run: (
		options: SlashCommandOptionValues<Options>,
		interaction: Discord.ChatInputCommandInteraction,
	) => unknown
}): SlashCommand {
	return {
		options,
		getData: () => ({
			...args,
			options: Object.entries(options).map(([name, option]) =>
				({
					...option.getData(name),
					name,
				}) as Discord.ApplicationCommandOptionData
			),
		}),
		run: async (interaction) => {
			const values: Record<string, unknown> = {}
			for (const [name, optionArg] of Object.entries(options)) {
				const value = await optionArg.getValue(name, interaction)
				if (optionArg.getData(name).required && value == null) {
					throw new Error(`Missing required option: ${name}`)
				}
				values[name] = value
			}
			await run(values as SlashCommandOptionValues<Options>, interaction)
		},
	}
}

function createOption<
	const Data extends Omit<OptionData, "name">,
	const Value,
>(
	data: Data,
	getValue: (
		name: string,
		interaction: Discord.ChatInputCommandInteraction,
	) => Value | null,
) {
	return {
		getData: (name: string) =>
			({
				...data,
				name,
				required: true,
			}) as const,
		getValue,
	}
}

export function optional<const Option extends SlashCommandOption>(
	option: Option,
) {
	return {
		...option,
		getData: (name) => ({ ...option.getData(name), required: false }),
	} satisfies SlashCommandOption
}

export function stringOption(
	description: string,
	choices?: [string, ...string[]],
) {
	return createOption({
		description,
		type: Discord.ApplicationCommandOptionType.String,
		choices: choices?.map((value) => ({ name: value, value })),
	}, (name, interaction) => interaction.options.getString(name))
}

export function numberOption(
	description: string,
	choices?: [number, ...number[]],
) {
	return createOption({
		description,
		type: Discord.ApplicationCommandOptionType.Number,
		choices: choices?.map((value) => ({ name: value.toString(), value })),
	}, (name, interaction) => interaction.options.getNumber(name))
}

export function integerOption(
	description: string,
	choices?: [number, ...number[]],
) {
	return createOption({
		description,
		type: Discord.ApplicationCommandOptionType.Integer,
		choices: choices?.map((value) => ({ name: value.toString(), value })),
	}, (name, interaction) => interaction.options.getInteger(name))
}

export function booleanOption(description: string) {
	return createOption({
		description,
		type: Discord.ApplicationCommandOptionType.Boolean,
	}, (name, interaction) => interaction.options.getBoolean(name))
}

export function userOption(description: string) {
	return createOption({
		description,
		type: Discord.ApplicationCommandOptionType.User,
	}, (name, interaction) => interaction.options.getUser(name))
}

export function channelOption(description: string) {
	return createOption({
		description,
		type: Discord.ApplicationCommandOptionType.Channel,
	}, (name, interaction) => interaction.options.getChannel(name))
}

export function roleOption(description: string) {
	return createOption({
		description,
		type: Discord.ApplicationCommandOptionType.Role,
	}, (name, interaction) => interaction.options.getRole(name))
}

export function mentionableOption(description: string) {
	return createOption({
		description,
		type: Discord.ApplicationCommandOptionType.Mentionable,
	}, (name, interaction) => interaction.options.getMentionable(name))
}
