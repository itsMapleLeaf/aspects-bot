import * as Discord from "discord.js"

export interface ButtonComponentArray
	extends Array<Discord.ButtonComponentData> {
	length: 1 | 2 | 3 | 4 | 5
}

export function buttonRow(
	components: ButtonComponentArray,
): Discord.ActionRowData<Discord.ButtonComponentData> {
	return {
		type: Discord.ComponentType.ActionRow,
		components,
	}
}
