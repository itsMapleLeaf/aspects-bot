import { SlashCommand } from "../discord/commands/SlashCommand.ts"

export const rollCommand = SlashCommand.create({
	name: "roll",
	description: "Roll some dice",
	options: {
		die: SlashCommand.string("The die to roll", {
			choices: ["d4", "d6", "d8", "d12", "d20"].map((d) => ({
				name: d,
				value: d,
			})),
		}),
		difficulty: SlashCommand.string.optional(
			"The difficulty die to roll against",
			{
				choices: ["d4", "d6", "d8", "d12", "d20"].map((d) => ({
					name: d,
					value: d,
				})),
			},
		),
		modify: SlashCommand.string.optional("Make the roll easier or harder", {
			choices: ["eased", "daunting"].map((m) => ({ name: m, value: m })),
		}),
		fatigue: SlashCommand.integer.optional("Number of fatigue dice to roll"),
		private: SlashCommand.boolean.optional(
			"Hide this roll from everyone but yourself.",
		),
	},
	run: async (options, interaction) => {
		const faces = parseInt(options.die.split("d")[1])

		const firstActionDie = Math.floor(Math.random() * faces + 1)
		let secondActionDie
		let actionResult = firstActionDie
		let difficultyResult
		let fatigueResults

		if (options.modify === "eased") {
			secondActionDie = Math.floor(Math.random() * faces + 1)
			actionResult = Math.max(firstActionDie, secondActionDie)
		} else if (options.modify === "daunting") {
			secondActionDie = Math.floor(Math.random() * faces + 1)
			actionResult = Math.min(firstActionDie, secondActionDie)
		}

		if (options.difficulty) {
			const difficultyFaces = parseInt(options.difficulty.split("d")[1])
			difficultyResult = Math.floor(Math.random() * difficultyFaces + 1)
		}

		if (options.fatigue) {
			fatigueResults = Array.from(
				{ length: options.fatigue },
				() => Math.floor(Math.random() * 6 + 1),
			)
		}

		const actionLine = secondActionDie
			? `⚡ Action: 2${options.die} (${options.modify}) -> **${actionResult}** (${firstActionDie}, ${secondActionDie})`
			: `⚡ Action: 1${options.die} -> **${actionResult}**`

		const difficultyLine = options.difficulty &&
			`💢 Difficulty: 1${options.difficulty} -> **${difficultyResult}**`

		const fatigueLine = fatigueResults &&
			`💤 Fatigue: ${options.fatigue}d6 -> ${
				fatigueResults.map((n) => `**${n}**`).join(", ")
			}`

		const resultLine = difficultyResult &&
			(actionResult >= difficultyResult ? `✅ **Success!**` : `❌ **Failure.**`)

		const effectLine =
			(difficultyResult == null || actionResult >= difficultyResult) &&
			`🔥 Effect: **${actionResult}**`

		const fatigueDamage = fatigueResults?.map((n) =>
			n === 6 ? 2 : n >= 4 ? 1 : 0
		).reduce<number>((a, b) => a + b, 0) ?? 0
		const fatigueDamageLine = fatigueDamage > 0 &&
			`💔 Fatigue Damage: **${fatigueDamage}**`

		await interaction.reply({
			content: joinTruthy([
				resultLine,
				effectLine,
				fatigueDamageLine,
				"\n" + actionLine,
				difficultyLine,
				fatigueLine,
			], "\n"),
			ephemeral: options.private ?? false,
		})
	},
})

function joinTruthy(values: unknown[], separator = " ") {
	return values.filter(Boolean).join(separator)
}