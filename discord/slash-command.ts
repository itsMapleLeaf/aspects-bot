import chalk from "npm:chalk"
import * as Discord from "npm:discord.js"
import prettyMs from "npm:pretty-ms"
import { callTimedAsync } from "../helpers/call-timed.ts"
import { NonNullableWhen } from "../types.ts"

export type SlashCommand = {
	data: Discord.ApplicationCommandData
	run: (interaction: Discord.ChatInputCommandInteraction) => unknown
}

export type SlashCommandOption = {
	data: Omit<
		Exclude<
			Discord.ApplicationCommandOptionData,
			| Discord.ApplicationCommandSubGroupData
			| Discord.ApplicationCommandSubCommandData
		>,
		"name"
	>
	getValue: (
		name: string,
		interaction: Discord.ChatInputCommandInteraction,
	) => unknown
}

type SlashCommandOptionValues<
	Options extends Record<string, SlashCommandOption>,
> = {
	[K in keyof Options]: NonNullableWhen<
		Options[K]["data"]["required"],
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
					commands.map((command) => command.data),
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
		if (!interaction.isChatInputCommand()) return

		const command = commands.find((c) =>
			c.data.name === interaction.commandName
		)

		try {
			await command?.run(interaction)
		} catch (error) {
			console.error(`Failed running command:`, error, {
				command: command?.data,
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
	})
}

export function defineSlashCommand<
	Options extends Record<string, SlashCommandOption>,
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
		data: {
			...args,
			options: Object.entries(options).map(([name, option]) =>
				({ ...option.data, name }) as Discord.ApplicationCommandOptionData
			),
		},
		run: async (interaction) => {
			const values: Record<string, unknown> = {}
			for (const [name, optionArg] of Object.entries(options)) {
				const value = await optionArg.getValue(name, interaction)
				if (optionArg.data.required && value == null) {
					throw new Error(`Missing required option: ${name}`)
				}
				values[name] = value
			}
			await run(values as SlashCommandOptionValues<Options>, interaction)
		},
	}
}

function createOption<
	const Data extends SlashCommandOption["data"],
	const Value,
>(
	data: Data,
	getValue: (
		name: string,
		interaction: Discord.ChatInputCommandInteraction,
	) => Value | null,
) {
	return {
		data: { ...data, required: true },
		getValue,
	} satisfies SlashCommandOption
}

export function optional<const Option extends SlashCommandOption>(
	option: Option,
) {
	return {
		...option,
		data: { ...option.data, required: false },
	} satisfies SlashCommandOption
}

export function stringOption(description: string) {
	return createOption({
		description,
		type: Discord.ApplicationCommandOptionType.String,
	}, (name, interaction) => interaction.options.getString(name))
}

export function integerOption(description: string) {
	return createOption({
		description,
		type: Discord.ApplicationCommandOptionType.Integer,
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
