import Color from "colorjs.io"
import * as Discord from "discord.js"
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

		const embed: Discord.APIEmbed = {}

		if (difficultyResult != null) {
			const isSuccess = actionResult >= difficultyResult

			const { r, g, b } = new Color("oklch", [
				0.65,
				0.15,
				isSuccess ? 150 : 20,
			]).toGamut({ space: "srgb" }).srgb

			const color =
				(Math.round(r * 255) << 16) |
				(Math.round(g * 255) << 8) |
				Math.round(b * 255)

			embed.title = isSuccess ? "✅ Success!" : "❌ Failure."
			embed.color = color
		} else {
			embed.title = "🎲 Roll Results"
		}

		embed.fields ??= []

		if (difficultyResult == null || actionResult >= difficultyResult) {
			embed.fields.push({
				name: `🔥 Effect: **${actionResult}**`,
				value: ` `,
			})
		}

		if (fatigueDamage > 0) {
			let value = " "

			if (character) {
				const previousHealth = character.data.health
				await character.update({
					health: Math.max(0, previousHealth - fatigueDamage),
				})
				value = `Health: **${previousHealth}** -> **${character.data.health}**`
			}

			embed.fields.push({
				name: `💔 Fatigue Damage: **${fatigueDamage}**`,
				value,
			})
		}

		embed.fields.push({
			name: "⚡ Action Dice",
			value: secondActionDie
				? `2${options.die} (${options.modify}) -> **${actionResult}** (${firstActionDie}, ${secondActionDie})`
				: `1${options.die} -> **${actionResult}**`,
		})

		if (options.difficulty) {
			embed.fields.push({
				name: "💢 Difficulty Die",
				value: `1${options.difficulty} -> **${difficultyResult}**`,
			})
		}

		if (fatigueResults) {
			embed.fields.push({
				name: "💤 Fatigue Dice",
				value: `${fatigue}d6 -> ${fatigueResults
					.map((n) => `**${n}**`)
					.join(", ")}`,
			})
		}

		await interaction.reply({
			embeds: [embed],
			ephemeral: options.private ?? false,
		})
	},
})
