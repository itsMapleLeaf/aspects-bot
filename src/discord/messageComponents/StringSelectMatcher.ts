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
		const options = data.options.slice(0, 25)

		const clampValueCountOption = (value: number | undefined) =>
			value == null ? undefined : Math.min(value, options.length, 25)

		return {
			type: Discord.ComponentType.ActionRow,
			components: [
				{
					...data,
					type: Discord.ComponentType.StringSelect,
					customId: this.customId,
					options: options,
					minValues: clampValueCountOption(data.minValues),
					maxValues: clampValueCountOption(data.maxValues),
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

	getSelectedValues(message: Discord.Message): string[] {
		const result = message.resolveComponent(this.customId)
		if (result?.type !== Discord.ComponentType.StringSelect) {
			return []
		}
		return result.options.flatMap((o) => (o.default ? [o.value] : []))
	}
}
