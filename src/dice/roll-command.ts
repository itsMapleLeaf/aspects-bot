import { getCharacter, updateCharacter } from "../characters/CharacterData.ts"
import { characterOption } from "../characters/characterOption.ts"
import { optionTypes } from "../discord/slash-command-option.ts"
import { defineSlashCommand } from "../discord/slash-command.ts"
import { roll } from "./roll.ts"

export const rollCommand = defineSlashCommand({
	name: "roll",
	description: "Roll some dice",
	options: {
		die: optionTypes.required(
			optionTypes.integer("The die to roll", {
				choices: [4, 6, 8, 12, 20].map((value) => ({
					name: `d${value}`,
					value,
				})),
			}),
		),
		difficulty: optionTypes.integer("The difficulty die to roll against", {
			choices: [4, 6, 8, 12, 20].map((value) => ({
				name: `d${value}`,
				value: value,
			})),
		}),
		modify: optionTypes.string("Make the roll easier or harder", {
			choices: ["eased", "daunting"].map((m) => ({ name: m, value: m })),
		}),
		fatigue: optionTypes.integer("Number of fatigue dice to roll"),
		private: optionTypes.boolean("Hide this roll from everyone but yourself."),
		character: characterOption("The character to roll for"),
	},
	run: async (interaction, options) => {
		const character = await getCharacter({
			discordUser: interaction.user,
		})
		const fatigue = options.fatigue ?? character?.fatigue

		const firstActionDie = roll(options.die)
		let secondActionDie
		let actionResult = firstActionDie
		let difficultyResult
		let fatigueResults

		if (options.modify === "eased") {
			secondActionDie = roll(options.die)
			actionResult = Math.max(firstActionDie, secondActionDie)
		} else if (options.modify === "daunting") {
			secondActionDie = roll(options.die)
			actionResult = Math.min(firstActionDie, secondActionDie)
		}

		if (options.difficulty) {
			difficultyResult = roll(options.difficulty)
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
				const previousHealth = character.health
				await updateCharacter(character.id, {
					health: Math.max(0, previousHealth - fatigueDamage),
				})
				valueLines.push(
					`❤️‍🩹 Health: **${previousHealth}** -> **${character.health}**`,
				)
			}
		}

		const diceLines = []

		const actionDiceList = secondActionDie
			? `2d${options.die} (${options.modify}) -> **${actionResult}** (${firstActionDie}, ${secondActionDie})`
			: `1d${options.die} -> **${actionResult}**`
		diceLines.push(`⚡ Action Dice: ${actionDiceList}`)

		if (options.difficulty) {
			diceLines.push(
				`💢 Difficulty Die: 1d${options.difficulty} -> **${difficultyResult}**`,
			)
		}

		if (fatigueResults) {
			const fatigueDieList = fatigueResults
				.map((n) => (n === 6 ? `__**${n}**__` : n >= 4 ? `**${n}**` : n))
				.join(", ")
			diceLines.push(`💤 Fatigue Dice: ${fatigue}d6 -> ${fatigueDieList}`)
		}

		await interaction.reply({
			content: [`## ${title}`, ...valueLines, "", ...diceLines].join("\n"),
			ephemeral: options.private ?? false,
		})
	},
})
