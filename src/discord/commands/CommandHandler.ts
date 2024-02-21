import * as Discord from "npm:discord.js"
import { Logger } from "../../logger.ts"
import { Command } from "./Command.ts"

export class CommandHandler {
	#commands: Command[]

	constructor(commands: Command[]) {
		this.#commands = commands
	}

	addListeners(client: Discord.Client) {
		client.on("ready", async (client) => {
			await Logger.promise(
				"Registering slash commands",
				client.application.commands.set(
					this.#commands.map((command) => command.data),
				),
			)
		})

		client.on("interactionCreate", async (interaction) => {
			for (const command of this.#commands) {
				if (await command.handleInteraction(interaction)) {
					return
				}
			}
		})
	}
}
