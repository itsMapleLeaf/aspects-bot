import { bold, mention } from "../discord/format.ts"
import { CharacterModel } from "./CharacterModel.ts"

export function createCharacterMessage(character: CharacterModel) {
	const lines = [
		`## ${character.data.name}`,
		``,

		`${character.data.race.emoji} ${bold(character.data.race.name)}`,
		`${character.data.aspect.emoji} ${bold(character.data.aspect.name)} (${
			character.data.aspect.attribute.emoji
		} ${character.data.aspect.attribute.name})`,
		`🪙 ${bold(character.data.currency)} Notes`,
		``,

		...character.baseAttributeDice.map(
			(entry) =>
				`${entry.attribute.emoji} ${entry.attribute.name}: ${bold(
					`d${entry.die}`,
				)}`,
		),
		``,

		`❤️‍🩹 Health`,
		range(character.maxHealth)
			.map((n) => (n < character.data.health ? "🟥" : "⬛"))
			.join(""),
		``,
	]

	if (character.data.fatigue > 0) {
		lines.push(
			`💤 Fatigue`,
			range(character.data.fatigue)
				.map(() => "🟦")
				.join(""),
			``,
		)
	}

	if (character.data.playerDiscordId) {
		lines.push(`Played by ${mention(character.data.playerDiscordId)}`)
	}

	return lines.join("\n")
}

function range(length: number) {
	return [...Array(length).keys()]
}
