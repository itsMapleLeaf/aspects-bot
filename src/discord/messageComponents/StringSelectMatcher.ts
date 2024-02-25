import * as Discord from "discord.js"
import { StrictOmit } from "../../types.ts"

export class StringSelectMatcher {
	readonly customId

	constructor(customId: string) {
		this.customId = customId
	}

	render(
		data: StrictOmit<
			Discord.StringSelectMenuComponentData,
			"type" | "customId"
		>,
	): Discord.ActionRowData<Discord.StringSelectMenuComponentData> {
		return {
			type: Discord.ComponentType.ActionRow,
			components: [
				{
					...data,
					type: Discord.ComponentType.StringSelect,
					customId: this.customId,
				},
			],
		}
	}

	matches(
		interaction: Discord.BaseInteraction,
	): interaction is Discord.StringSelectMenuInteraction {
		return (
			interaction.isStringSelectMenu() && interaction.customId === this.customId
		)
	}
}
