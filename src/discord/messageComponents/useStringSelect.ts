import * as Discord from "discord.js"
import type { StrictOmit } from "../../types.js"
import { messageComponentStore } from "./MessageComponentStore.js"

export function useStringSelect(args: {
	customId: string
	onSelect: (interaction: Discord.StringSelectMenuInteraction) => Promise<void>
}) {
	messageComponentStore.addHandler(args.customId, async (interaction) => {
		if (!interaction.isStringSelectMenu()) return
		await args.onSelect(interaction)
	})

	return {
		render(
			data: StrictOmit<Discord.StringSelectMenuComponentData, "type" | "customId">,
		): Discord.ActionRowData<Discord.StringSelectMenuComponentData> {
			const { onSelect, ...baseData } = args
			const options = data.options.slice(0, 25)

			const clampValueOption = (value: number | undefined) =>
				value === undefined ? undefined : Math.max(0, Math.min(25, options.length, value))

			return {
				type: Discord.ComponentType.ActionRow,
				components: [
					{
						...baseData,
						...data,
						type: Discord.ComponentType.StringSelect,
						options,
						minValues: clampValueOption(data.minValues),
						maxValues: clampValueOption(data.maxValues),
					},
				],
			}
		},

		getSelectedValues(message: Discord.Message): string[] {
			const interaction = message.resolveComponent(args.customId)
			return interaction?.type === Discord.ComponentType.StringSelect ?
					interaction.options.filter((o) => o.default).map((o) => o.value)
				:	[]
		},
	}
}
