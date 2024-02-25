import * as Discord from "discord.js"
import { StrictOmit } from "../types.ts"

export function stringSelectMenu(
	options: StrictOmit<Discord.StringSelectMenuComponentData, "type">,
): Discord.ActionRowData<Discord.StringSelectMenuComponentData> {
	return {
		type: Discord.ComponentType.ActionRow,
		components: [
			{
				...options,
				type: Discord.ComponentType.StringSelect,
			},
		],
	}
}

export function buttonRow(
	buttons: Discord.ButtonComponentData[],
): Discord.ActionRowData<Discord.ButtonComponentData> {
	return {
		type: Discord.ComponentType.ActionRow,
		components: buttons,
	}
}

export function button(
	options: StrictOmit<Discord.ButtonComponentData, "type">,
): Discord.ButtonComponentData {
	return {
		...options,
		type: Discord.ComponentType.Button,
	}
}
