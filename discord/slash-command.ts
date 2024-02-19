import chalk from "npm:chalk"
import * as Discord from "npm:discord.js"
import prettyMs from "npm:pretty-ms"
import { callTimedAsync } from "../helpers/call-timed.ts"
import { NonNullableWhen } from "../types.ts"

export type SlashCommand = {
	data: Discord.ApplicationCommandData
	run: (
		interaction: Discord.ChatInputCommandInteraction,
	) => unknown
}

type SlashCommandOptionValues<
	Options extends Record<string, {
		type: Discord.ApplicationCommandOptionType
		required?: boolean
	}>,
> = {
	[K in keyof Options]: NonNullableWhen<
		Options[K]["required"],
		SlashCommandOptionValueMap[Options[K]["type"]]
	>
}

type SlashCommandOptionValueMap = {
	[Discord.ApplicationCommandOptionType.String]: string
	[Discord.ApplicationCommandOptionType.Integer]: number
	[Discord.ApplicationCommandOptionType.Number]: number
	[Discord.ApplicationCommandOptionType.Boolean]: boolean
	[Discord.ApplicationCommandOptionType.Attachment]: string
	[Discord.ApplicationCommandOptionType.User]: Discord.User
	[Discord.ApplicationCommandOptionType.Channel]: Discord.Channel
	[Discord.ApplicationCommandOptionType.Role]: Discord.Role
	[Discord.ApplicationCommandOptionType.Mentionable]:
		| Discord.User
		| Discord.Role
	[type: number]: unknown
}

export function defineSlashCommand<
	Options extends Record<
		string,
		Omit<Discord.ApplicationCommandOptionData, "name">
	>,
>({ run, ...args }: {
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
			options: Object.entries(args.options).map(([name, option]) => {
				return { ...option, name } as Discord.ApplicationCommandOptionData
			}),
		},
		run: async (interaction) => {
			const options: Record<string, SlashCommandOptionValueMap[number]> = {}
			for (const [name, optionArg] of Object.entries(args.options)) {
				const option = interaction.options.get(name)
				if (option === null && "required" in optionArg && optionArg.required) {
					throw new Error(
						`Missing required option "${name}" for command "${args.name}"`,
					)
				}
				options[name] = option?.value
			}
			await run(options as SlashCommandOptionValues<Options>, interaction)
		},
	}
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
