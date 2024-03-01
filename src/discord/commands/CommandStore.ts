import * as Discord from "discord.js"
import { inspect } from "util"
import { join, map } from "../../helpers/iterable.ts"
import { Logger } from "../../logger.ts"
import { InteractionResponse } from "./InteractionResponse.ts"

export type SlashCommand = {
	data: Discord.ApplicationCommandData
	run(interaction: Discord.ChatInputCommandInteraction): Promise<CommandReply>
}

export type CommandReply = Discord.InteractionReplyOptions | string

export type AutocompleteFn = (
	interaction: Discord.AutocompleteInteraction,
) => Promise<Discord.ApplicationCommandOptionChoiceData[]>

export type Autocompletion = {
	autocomplete: AutocompleteFn
}

type CommandName = string
type OptionName = string

export const commandStore = new (class CommandStore {
	#commands = new Map<CommandName, SlashCommand>()
	#autocompletions = new Map<`${CommandName}:${OptionName}`, Autocompletion>()

	async runCommand(command: SlashCommand, interaction: Discord.ChatInputCommandInteraction) {
		try {
			const reply = await command.run(interaction)
			await interaction.reply({
				ephemeral: true,
				allowedMentions: { users: [], roles: [], repliedUser: false },
				...(typeof reply === "string" ? { content: reply } : reply),
			})
		} catch (error) {
			if (error instanceof InteractionResponse) {
				await addInteractionReply(interaction, {
					ephemeral: true,
					...error.options,
				})
			} else {
				throw error
			}
		}
	}

	addCommand<T extends SlashCommand>(command: T) {
		this.#commands.set(command.data.name, command)
		return command
	}

	addAutocompletion<T extends Autocompletion>(
		commandName: CommandName,
		optionName: OptionName,
		autocompletion: T,
	) {
		this.#autocompletions.set(`${commandName}:${optionName}`, autocompletion)
		return autocompletion
	}

	addListeners(client: Discord.Client) {
		client.on("ready", async (client) => {
			const data = () => map(this.#commands.values(), (command) => command.data)

			Logger.info((f) => {
				const names = map(expandCommandNames(data()), (name) => `/${f.highlight(name)}`)
				return `Using commands: ${join(names, ", ")}`
			})

			await Logger.async("Registering slash commands", () =>
				client.application.commands.set([...data()]),
			)
		})

		client.on("interactionCreate", async (interaction) => {
			if (interaction.isChatInputCommand()) {
				const command = this.#commands.get(interaction.commandName)
				if (!command) return

				const [, error] = await Logger.async(
					(f) => f.base(`Running /${f.highlight(getCommandName(interaction))}`),
					() => this.runCommand(command, interaction),
				)

				if (error) {
					await addInteractionReply(interaction, {
						content: "Sorry, something went wrong. Try again?",
						ephemeral: true,
					})
				}
			}

			if (interaction.isAutocomplete()) {
				const focused = interaction.options.getFocused(true)
				const key = `${interaction.commandName}:${focused.name}` as const
				const autocompletion = this.#autocompletions.get(key)
				if (!autocompletion) {
					Logger.error((f) => {
						const available = join(
							map(this.#autocompletions.keys(), (key) => "- " + f.highlight(key)),
							"\n",
						)
						return `No autocompletion for ${key}. Available completions:\n${available}`
					})
					return
				}

				await Logger.async(
					(f) =>
						f.base(
							`Running autocompletion for /${f.highlight(getCommandName(interaction))} [${f.highlight(focused.name)}]`,
						),
					async () => {
						const choices = await autocompletion.autocomplete(interaction)
						const clamped = choices.slice(0, 25)
						if (clamped.length > choices.length) {
							Logger.warn(`Clamped ${choices.length} autocompletions to 25 for ${key}`)
						}
						await interaction.respond(clamped)
					},
				)
			}
		})
	}
})()

function getCommandName(
	interaction: Discord.ChatInputCommandInteraction | Discord.AutocompleteInteraction,
) {
	const subgroup = interaction.options.getSubcommandGroup(false)
	const subcommand = interaction.options.getSubcommand(false)
	const name = [interaction.commandName, subgroup, subcommand].filter(Boolean).join(" ")
	return name
}

function* expandCommandNames(data: Iterable<Discord.ApplicationCommandData>) {
	for (const entry of data) {
		if (entry.type !== Discord.ApplicationCommandType.ChatInput && entry.type !== undefined) {
			yield entry.name
			continue
		}

		let hasSubcommands = false
		for (const option of entry.options ?? []) {
			if (
				option.type === Discord.ApplicationCommandOptionType.Subcommand ||
				option.type === Discord.ApplicationCommandOptionType.SubcommandGroup
			) {
				yield `${entry.name} ${option.name}`
				hasSubcommands = true
			}
		}

		if (!hasSubcommands) {
			yield entry.name
		}
	}
}

async function addInteractionReply(
	interaction: Discord.RepliableInteraction,
	options: Discord.InteractionReplyOptions,
) {
	try {
		if (interaction.deferred || interaction.replied) {
			await interaction.followUp(options)
		} else {
			await interaction.reply(options)
		}
	} catch (error) {
		Logger.error(`Failed to reply to interaction. ${inspect(error, { depth: 10 })}`)
	}
}
