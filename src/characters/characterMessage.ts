import { bold, mention } from "../discord/format.ts"
import { join, map, range } from "../helpers/iterable.ts"
import { CharacterData } from "./CharacterData.ts"

export function createCharacterMessage(character: CharacterData) {
	const lines = [
		`## ${character.name}`,
		``,

		`${character.race.emoji} ${bold(character.race.name)}`,
		`${character.aspect.emoji} ${bold(character.aspect.name)} (${
			character.aspect.attribute.emoji
		} ${character.aspect.attribute.name})`,
		`🪙 ${bold(character.currency)} Notes`,
		``,

		...map(
			character.baseAttributeDice.values(),
			(entry) =>
				`${entry.attribute.emoji} ${entry.attribute.name}: ${bold(
					`d${entry.die}`,
				)}`,
		),
		``,

		`❤️‍🩹 Health`,
		join(
			map(range(character.maxHealth), (n) =>
				n < character.health ? "🟥" : "⬛",
			),
		),
		``,
	]

	if (character.fatigue > 0) {
		lines.push(
			`💤 Fatigue`,
			join(map(range(character.fatigue), () => "🟦")),
			``,
		)
	}

	if (character.playerDiscordId) {
		lines.push(`Played by ${mention(character.playerDiscordId)}`)
	}

	return lines.join("\n")
}
