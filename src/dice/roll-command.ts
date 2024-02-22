import { CharacterModel } from "../characters/CharacterModel.ts"
import { characterOption } from "../characters/character-option.ts"
import { optionTypes } from "../discord/slash-command-option.ts"
import { defineSlashCommand } from "../discord/slash-command.ts"

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
		difficulty: optionTypes.string("The difficulty die to roll against", {
			choices: ["d4", "d6", "d8", "d12", "d20"].map((d) => ({
				name: d,
				value: d,
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
		const character = await CharacterModel.fromPlayer(interaction.user)
		const fatigue = options.fatigue ?? character?.data.fatigue

		const firstActionDie = Math.floor(Math.random() * options.die + 1)
		let secondActionDie
		let actionResult = firstActionDie
		let difficultyResult
		let fatigueResults

		if (options.modify === "eased") {
			secondActionDie = Math.floor(Math.random() * options.die + 1)
			actionResult = Math.max(firstActionDie, secondActionDie)
		} else if (options.modify === "daunting") {
			secondActionDie = Math.floor(Math.random() * options.die + 1)
			actionResult = Math.min(firstActionDie, secondActionDie)
		}

		if (options.difficulty) {
			const difficultyFaces = parseInt(options.difficulty.split("d")[1])
			difficultyResult = Math.floor(Math.random() * difficultyFaces + 1)
		}

		if (fatigue) {
			fatigueResults = Array.from({ length: fatigue }, () =>
				Math.floor(Math.random() * 6 + 1),
			)
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
				const previousHealth = character.data.health
				await character.update({
					health: Math.max(0, previousHealth - fatigueDamage),
				})
				valueLines.push(
					`❤️‍🩹 Health: **${previousHealth}** -> **${character.data.health}**`,
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
