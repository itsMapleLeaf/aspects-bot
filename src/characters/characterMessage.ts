import { bold, mention } from "../discord/format.ts"
import { join, map, range } from "../helpers/iterable.ts"
import { CharacterData } from "./CharacterData.ts"

export function createCharacterMessage(character: CharacterData) {
	const lines = [
		`## ${character.name}`,
		``,

		`${character.race.emoji} ${bold(character.race.name)}`,
		`${character.aspectAttribute.aspectEmoji} ${bold(character.aspectAttribute.aspectName)} (${
			character.aspectAttribute.emoji
		} ${character.aspectAttribute.name})`,
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

	if (character.player) {
		lines.push(`Played by ${mention(character.player.discordUserId)}`)
	}

	return lines.join("\n")
}
