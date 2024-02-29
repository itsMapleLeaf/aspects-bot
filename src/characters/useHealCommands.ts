import { bold } from "discord.js"
import { db } from "../db.ts"
import { InteractionResponse } from "../discord/commands/InteractionResponse.ts"
import { useSlashCommand } from "../discord/commands/useSlashCommand.ts"
import { addHealth, formatHealthResult } from "./CharacterData.ts"
import { autocompleteCharacter } from "./autocompleteCharacter.ts"
import { useCharacterInteraction } from "./useCharacterInteraction.ts"

export function useHealCommands() {
	let currentAmount: number | undefined

	const healing = useCharacterInteraction({
		selectCustomId: "heal:characters",

		onSubmit: async (characters) => {
			const amount = currentAmount
			if (!amount) {
				return {
					content: `Oops, it looks like this command expired. Try again.`,
				}
			}

			currentAmount = undefined

			const attributes = await db.attribute.findMany()
			const results = await Promise.all(
				characters.map((c) => addHealth(c, amount, attributes)),
			)

			let content
			if (amount > 0) {
				content = `Healed ${bold(String(amount))} health.`
			} else {
				content = `Dealt ${bold(String(-amount))} damage.`
			}

			content += `\n${results.map((result) => `- ${formatHealthResult(result)}`).join("\n")}`
			return { content }
		},
	})

	useSlashCommand({
		name: "heal",
		description: "Gain health",
		options: (t) => ({
			amount: t.integer("The amount to heal", { required: true }),
			character: t.string("The character to heal", {
				autocomplete: autocompleteCharacter,
			}),
		}),
		run: async ({ interaction, options }) => {
			if (options.amount < 1) {
				throw new InteractionResponse("Enter a positive number.")
			}
			currentAmount = options.amount
			await healing.handleInteraction(
				interaction,
				options.character,
				`Select characters to heal for ${options.amount} health`,
			)
		},
	})

	useSlashCommand({
		name: "damage",
		description: "Deal damage",
		options: (t) => ({
			amount: t.integer("The damage amount", { required: true }),
			character: t.string("The character to damage", {
				autocomplete: autocompleteCharacter,
			}),
		}),
		run: async ({ interaction, options }) => {
			if (options.amount < 1) {
				throw new InteractionResponse("Enter a positive number.")
			}
			currentAmount = -options.amount
			await healing.handleInteraction(
				interaction,
				options.character,
				`Select characters to deal ${options.amount} damage`,
			)
		},
	})
}
