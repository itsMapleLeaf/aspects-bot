import * as Discord from "discord.js"
import { ButtonStyle } from "discord.js"
import { db } from "../db.ts"
import { InteractionHandler } from "../discord/interactions/InteractionHandler.ts"
import { ButtonMatcher } from "../discord/messageComponents/ButtonMatcher.ts"
import { StringSelectMatcher } from "../discord/messageComponents/StringSelectMatcher.ts"
import { buttonRow } from "../discord/messageComponents/buttonRow.ts"

const participantSelect = new StringSelectMatcher("participantSelector:select")
const doneButton = new ButtonMatcher("participantSelector:done")

class ParticipantSelector implements InteractionHandler {
	async render(
		args: { selected?: Iterable<string> } = {},
	): Promise<Discord.BaseMessageOptions> {
		const characters = await db.query.charactersTable.findMany({
			with: {
				player: true,
			},
		})

		const selected = new Set(
			args.selected ?? characters.filter((c) => c.player).map((c) => c.id),
		)

		const options = characters.map((c) => ({
			label: c.name,
			value: c.id,
			default: selected.has(c.id),
		}))

		return {
			content: "Select combat participants.",
			components: [
				participantSelect.render({
					minValues: 1,
					maxValues: Math.min(characters.length, 25),
					options: options.slice(0, 25),
				}),
				buttonRow([
					doneButton.render({
						label: "Done",
						style: ButtonStyle.Primary,
					}),
				]),
			],
		}
	}

	async handleInteraction(interaction: Discord.Interaction) {
		if (participantSelect.matches(interaction)) {
			await interaction.update(
				await this.render({
					selected: interaction.values,
				}),
			)
		}
		if (doneButton.matches(interaction)) {
			await interaction.update({
				content: "Combat participants selected.",
				components: [],
			})
		}
	}
}

export const participantSelector = new ParticipantSelector()
