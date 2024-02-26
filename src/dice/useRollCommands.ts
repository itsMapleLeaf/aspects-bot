import * as Discord from "discord.js"
import { getCharacter, updateCharacter } from "../characters/CharacterData.ts"
import { db } from "../db.ts"
import { useSlashCommand } from "../discord/commands/useSlashCommand.ts"
import { join, map, range } from "../helpers/iterable.ts"
import { charactersTable } from "../schema.ts"
import { roll } from "./roll.ts"

export function useRollCommands() {
	const attributeDice = [4, 6, 8, 12, 20] as const

	const diceChoices = attributeDice.map((value) => ({
		name: `d${value}`,
		value,
	}))

	const modifyChoices = [
		{ name: "eased", value: "eased" },
		{ name: "daunting", value: "daunting" },
	] as const

	useSlashCommand("roll", {
		description: "Make a simple dice roll",

		options: (t) => ({
			die: t.integer("The die to roll", {
				required: true,
				choices: [
					...diceChoices,
					{ name: "d2", value: 2 },
					{ name: "d10", value: 2 },
					{ name: "d100", value: 100 },
				],
			}),
			count: t.integer("The number of dice to roll, default 1"),
			private: t.boolean("Hide this roll from everyone but yourself."),
		}),

		async run({ interaction, options }) {
			const count = options.count ?? 1

			const rolls = map(range(count), () =>
				Discord.bold(`${roll(options.die)}`),
			)

			await interaction.reply({
				content: `🎲 ${count}d${options.die} => ${join(rolls, ", ")}`,
				ephemeral: options.private ?? false,
			})
		},
	})

	useSlashCommand("action", {
		description: "Make an action roll",

		options: (t) => ({
			die: t.integer("The die to roll", {
				required: true,
				choices: diceChoices,
			}),
			difficulty: t.integer("The difficulty die to roll against", {
				choices: diceChoices,
			}),
			modify: t.string("Make the roll easier or harder", {
				choices: modifyChoices,
			}),
			fatigue: t.integer("Number of fatigue dice to roll"),
			private: t.boolean("Hide this roll from everyone but yourself."),
			character: t.string("The character to roll for", {
				autocomplete: async (input) => {
					const results = await db.query.charactersTable.findMany({
						...(input && {
							where: (cols, ops) => ops.like(cols.name, `%${input}%`),
						}),
						orderBy: [charactersTable.name],
					})

					return results.map((c) => ({
						name: c.name,
						value: c.id,
					}))
				},
			}),
		}),

		async run({ interaction, options }) {
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

	// todo: command to roll a character's attribute die
}
