import * as Discord from "discord.js"

export interface Command {
	get data(): Discord.ApplicationCommandData
	handleInteraction(interaction: Discord.Interaction): Promise<boolean>
}
