import * as Discord from "discord.js"

export interface Command {
	get data(): Discord.ApplicationCommandData
	match(interaction: Discord.CommandInteraction): CommandMatchResult | undefined
}

export type CommandMatchResult = {
	name: string
	run: () => unknown
}
