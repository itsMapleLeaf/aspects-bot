import * as Discord from "discord.js"
import { StrictOmit } from "../../types.ts"
import { messageComponentStore } from "./MessageComponentStore.ts"

export function useButton(args: {
	customId: string
	onClick: (interaction: Discord.ButtonInteraction) => Promise<void>
}) {
	messageComponentStore.addHandler(args.customId, async (interaction) => {
		if (!interaction.isButton()) return
		await args.onClick(interaction)
	})

	return {
		render(
			overrides: StrictOmit<
				Discord.InteractionButtonComponentData,
				"type" | "customId"
			>,
		): Discord.InteractionButtonComponentData {
			const { onClick, ...defaults } = args
			return { ...defaults, ...overrides, type: Discord.ComponentType.Button }
		},
	}
}

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
