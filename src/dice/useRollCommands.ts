import { CharacterModel } from "../characters/CharacterModel.ts"
import { autocompleteCharacter } from "../characters/autocompleteCharacter.ts"
import { InteractionResponse } from "../discord/commands/InteractionResponse.ts"
import { useGuildSlashCommand } from "../discord/commands/useGuildSlashCommand.ts"
import { ActionDice, Attributes, Dice } from "../game/tables.ts"
import { roll } from "./roll.ts"

const modifyChoices = [
	{ name: "eased", value: "eased" },
	{ name: "daunting", value: "daunting" },
] as const

export function useRollCommands() {
	useGuildSlashCommand({
		name: "roll",
		description: "Roll some dice",

		options: (t) => ({
			die: t.string("The dice or attribute to roll with", {
				required: true,
				choices: [...Dice.choices(), ...Attributes.choices()],
			}),
			difficulty: t.string("The difficulty die to roll against", {
				choices: ActionDice.choices(),
			}),
			modify: t.string("Make the roll daunting or eased", {
				choices: modifyChoices,
			}),
			fatigue: t.integer("Number of fatigue dice to roll. Uses your current fatigue by default."),
			private: t.boolean("Hide this roll from everyone but yourself."),
			character: t.string("The character to roll for. Uses your character by default.", {
				autocomplete: autocompleteCharacter,
			}),
		}),

		async run({ options, getInteractingUserCharacter }) {
			let character = await getInteractingUserCharacter()
			if (!character && options.character) {
				character = await CharacterModel.getById(options.character)
			}

			const fatigue = options.fatigue ?? character?.data.fatigue

			let actionDie: number
			if (Attributes.isKey(options.die)) {
				if (!character) {
					throw new InteractionResponse(
						"You must have or specify a character to roll an attribute die.",
					)
				}
				actionDie = character.attributes[options.die]
			} else {
				actionDie = Dice.getValue(options.die)
			}

			const firstActionDie = roll(actionDie)
			let secondActionDie
			let actionResult = firstActionDie
			let difficultyResult
			let fatigueResults

			if (options.modify === "eased") {
				secondActionDie = roll(actionDie)
				actionResult = Math.max(firstActionDie, secondActionDie)
			} else if (options.modify === "daunting") {
				secondActionDie = roll(actionDie)
				actionResult = Math.min(firstActionDie, secondActionDie)
			}

			if (options.difficulty) {
				difficultyResult = roll(Dice.getValue(options.difficulty))
			}

			if (fatigue) {
				fatigueResults = Array.from({ length: fatigue }, () => roll(6))
			}

			const fatigueDamage =
				fatigueResults
					?.map((n) => (n === 6 ? 2 : n >= 4 ? 1 : 0))
					.reduce<number>((a, b) => a + b, 0) ?? 0

			let title = "🎲 Roll Results"

			if (difficultyResult != null) {
				const isSuccess = actionResult >= difficultyResult
				title = isSuccess ? "✅ Success!" : "❌ Failure."
			}

			const valueLines = []

			if (difficultyResult == null || actionResult >= difficultyResult) {
				valueLines.push(`🔥 Effect: **${actionResult}**`)
			}

			if (fatigueDamage > 0) {
				valueLines.push(`💔 Fatigue Damage: **${fatigueDamage}**`)
				if (character) {
					const updated = await character.update({
						health: Math.max(0, character.health - fatigueDamage),
					})
					valueLines.push(`❤️‍🩹 Health: **${character.health}** -> **${updated.health}**`)
				}
			}

			const diceLines = []

			const actionDiceList = secondActionDie
				? `2d${actionDie} (${options.modify}) -> **${actionResult}** (${firstActionDie}, ${secondActionDie})`
				: `1d${actionDie} -> **${actionResult}**`
			diceLines.push(`⚡ Action Dice: ${actionDiceList}`)

			if (options.difficulty) {
				diceLines.push(`💢 Difficulty Die: 1${options.difficulty} -> **${difficultyResult}**`)
			}

			if (fatigueResults) {
				const fatigueDieList = fatigueResults
					.map((n) => (n === 6 ? `__**${n}**__` : n >= 4 ? `**${n}**` : n))
					.join(", ")
				diceLines.push(`💤 Fatigue Dice: ${fatigue}d6 -> ${fatigueDieList}`)
			}

			return {
				content: [`## ${title}`, ...valueLines, "", ...diceLines].join("\n"),
				ephemeral: options.private ?? false,
			}
		},
	})

	// todo: command to roll a character's attribute die
}
