import { ButtonStyle } from "discord.js"
import { db } from "../db.ts"
import {
	button,
	buttonRow,
	createMessageComponentRenderer,
	stringSelectMenu,
} from "../discord/message-component-renderer.ts"

export const participantSelector = createMessageComponentRenderer(
	async (selected?: Set<string>) => {
		const characters = await db.query.charactersTable.findMany({
			with: {
				player: true,
			},
		})

		selected ??= new Set(characters.filter((c) => c.player).map((c) => c.id))

		const options = characters.map((c) => ({
			label: c.name,
			value: c.id,
			default: selected.has(c.id),
		}))

		return {
			content: "Select combat participants.",
			components: [
				stringSelectMenu({
					customId: "select-participants",
					minValues: 1,
					maxValues: Math.min(characters.length, 25),
					options: options.slice(0, 25),
					onInteraction: async (interaction) => {
						await interaction.update(
							await participantSelector.render(new Set(interaction.values)),
						)
					},
				}),
				buttonRow([
					button({
						customId: "done",
						label: "Done",
						style: ButtonStyle.Primary,
						onInteraction: async (interaction) => {
							await interaction.update({
								content: "Combat started!",
								components: [],
							})
						},
					}),
				]),
			],
		}
	},
)
