import * as Discord from "npm:discord.js"

export interface Command {
	get data(): Discord.ApplicationCommandData
	handleInteraction(interaction: Discord.Interaction): Promise<boolean>
}
