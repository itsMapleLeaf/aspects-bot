import type { AutocompleteInteraction } from "discord.js"
import { db } from "../db.js"

export async function autocompleteCharacter(interaction: AutocompleteInteraction) {
	if (!interaction.inGuild()) {
		return []
	}

	const input = interaction.options.getFocused(true).value

	const results = await db.character.findMany({
		...(input && {
			where: {
				guildId: interaction.guildId,
				name: { contains: input },
			},
		}),
		orderBy: { name: "asc" },
	})

	return results.map((c) => ({
		name: c.name,
		value: c.id,
	}))
}
