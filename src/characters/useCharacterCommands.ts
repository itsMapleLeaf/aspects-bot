import { inlineCode } from "discord.js"
import { db } from "../db.ts"
import { InteractionResponse } from "../discord/commands/InteractionResponse.ts"
import { useGameMasterSlashCommand } from "../discord/commands/useGameMasterSlashCommand.ts"
import { useGuildSlashCommand } from "../discord/commands/useGuildSlashCommand.ts"
import type {
	OptionRecord,
	OptionValues,
	optionTypes,
} from "../discord/commands/useSlashCommand.ts"
import { useStringSelect } from "../discord/messageComponents/useStringSelect.ts"
import { Aspects, Attributes, Dice, Races } from "../game/tables.ts"
import { exclude } from "../helpers/iterable.ts"
import { randomItem } from "../helpers/random.ts"
import type { Nullish } from "../types.ts"
import { CharacterModel } from "./CharacterModel.ts"
import { autocompleteCharacter } from "./autocompleteCharacter.ts"
import { characterNames } from "./characterNames.ts"

export async function useCharacterCommands() {
	//#region create
	useGameMasterSlashCommand({
		name: "create",
		description: "Create a character. Leave values blank to generate them.",
		options: (t) => ({
			name: t.string("The character's name"),
			player: t.user("The player of the character"),
			race: t.string("The character's race", {
				choices: Races.choices(),
			}),
			aspect: t.string("The character's aspect", {
				choices: Aspects.choices(),
			}),
			primary_attribute: t.string("The character's primary (d12) attribute", {
				choices: Dice.choices(),
			}),
			secondary_attribute: t.string("The character's secondary (d8) attribute", {
				choices: Dice.choices(),
			}),
			tertiary_attribute: t.string("The character's tertiary (d6) attribute", {
				choices: Dice.choices(),
			}),
			fatigue: t.integer("The character's starting fatigue"),
			notes: t.integer("The amount of notes (currency) the character starts with"),
		}),
		run: async ({ options, guild }) => {
			if (options.name) {
				const existing = await db.character.findFirst({
					where: { name: options.name },
				})
				if (existing) {
					throw new InteractionResponse(
						`Oops, I already found a character named "${options.name}". Try again with a different name.`,
					)
				}
			}

			let name: Nullish<string> = options.name
			if (!name) {
				const existingCharacters = await db.character.findMany({
					select: { name: true },
				})

				const availableCharacterNames = exclude(
					characterNames,
					existingCharacters.map((c) => c.name),
				)

				name = randomItem(availableCharacterNames)
			}

			if (!name) {
				throw new InteractionResponse(
					[
						`Oh sheesh, it looks like I ran out of names.`,
						`You'll have to come up with one yourself. Sorry!`,
					].join("\n"),
				)
			}

			const character = await CharacterModel.create({
				name,
				raceId: options.race ?? Races.randomKey(),
				aspectId: options.aspect ?? Aspects.randomKey(),
				primaryAttributeId: options.primary_attribute ?? Attributes.randomKey(),
				secondaryAttributeId: options.secondary_attribute ?? Attributes.randomKey(),
				tertiaryAttributeId: options.tertiary_attribute ?? Attributes.randomKey(),
				guildId: guild.id,
				playerId: options.player?.id,
			})

			return {
				content: `Character created!\n${character.format()}`,
				ephemeral: true,
			}
		},
	})
	//#endregion

	//#region show
	useGuildSlashCommand({
		name: "show",
		description: "Show character details",
		run: async ({ interaction, guild, isGameMaster }) => {
			if (!isGameMaster) {
				const character = await CharacterModel.getByPlayer({
					guildId: guild.id,
					playerId: interaction.user.id,
				})
				if (!character) {
					throw new InteractionResponse(
						"You don't have a character assigned. Ask the GM to assign one to you!",
					)
				}
				return { content: character.format() }
			}

			return { content: "wip" }
		},
	})
	//#endregion

	//#region update
	useGameMasterSlashCommand({
		name: "update",
		description: "Update a character",
		options: (t) => ({
			character: t.string("The character to update. Omit to update many characters.", {
				required: true,
				autocomplete: autocompleteCharacter,
			}),
			health: t.string("The character's health, prefix with + or - to adjust"),
			fatigue: t.string("The character's fatigue, prefix with + or - to adjust"),
			notes: t.string("The character's notes (currency) amount, prefix with + or - to adjust"),
			name: t.string("The character's name"),
			race: t.string("The character's race", {
				choices: Races.choices(),
			}),
			aspect: t.string("The character's aspect", {
				choices: Aspects.choices(),
			}),
			primary_attribute: t.string("The character's primary (d12) attribute", {
				choices: Dice.choices(),
			}),
			secondary_attribute: t.string("The character's secondary (d8) attribute", {
				choices: Dice.choices(),
			}),
			tertiary_attribute: t.string("The character's tertiary (d6) attribute", {
				choices: Dice.choices(),
			}),
			player: t.user("The new player to assign the character to"),
		}),
		run: async (args) => {
			let character = await args.getCharacter(args.options.character)
			if (!character) {
				return `Oops, I couldn't find that character.`
			}

			character = await character.update({
				name: args.options.name ?? character.data.name,
				raceId: args.options.race ?? character.data.raceId,
				aspectId: args.options.aspect ?? character.data.aspectId,
				primaryAttributeId: args.options.primary_attribute ?? character.data.primaryAttributeId,
				secondaryAttributeId:
					args.options.secondary_attribute ?? character.data.secondaryAttributeId,
				tertiaryAttributeId: args.options.tertiary_attribute ?? character.data.tertiaryAttributeId,
				health: adjust(character.health, args.options.health),
				fatigue: adjust(character.data.fatigue, args.options.fatigue),
				currency: adjust(character.data.currency, args.options.notes),
				...(args.options.player && { player: { id: args.options.player.id } }),
			})

			return {
				content: `Updated!\n${character.format()}`,
				ephemeral: true,
			}
		},
	})
	//#endregion

	useCharacterUpdateCommand({
		name: "heal",
		description: "Gain health",
		options: (t) => ({
			health: t.integer("The amount to heal", { required: true }),
		}),
		getSelectPlaceholder: (options) => `Select characters to heal for ${options.health} health`,
		update: async (character, options) => {
			const updated = await character.update({
				health: character.health + requirePositiveInteger(options, "health"),
			})
			return `${character.data.name}: ${character.health}/${character.maxHealth} ⇒ ${updated.health}/${updated.maxHealth}`
		},
	})

	useCharacterUpdateCommand({
		name: "damage",
		description: "Deal damage",
		options: (t) => ({
			damage: t.integer("The damage amount", { required: true }),
		}),
		getSelectPlaceholder: (options) => `Select characters to deal ${options.damage} damage`,
		update: async (character, options) => {
			const updated = await character.update({
				health: character.health - requirePositiveInteger(options, "damage"),
			})
			return `${character.data.name}: ${character.health}/${character.maxHealth} ⇒ ${updated.health}/${updated.maxHealth}`
		},
	})

	useCharacterUpdateCommand({
		name: "fatigue",
		description: "Adjust fatigue",
		options: (t) => ({
			fatigue: t.integer("The amount to adjust", { required: true }),
		}),
		getSelectPlaceholder: (options) => `Select characters to adjust fatigue by ${options.fatigue}`,
		update: async (character, options) => {
			const updated = await character.update({
				fatigue: character.data.fatigue + options.fatigue,
			})
			return `${character.data.name}: ${character.data.fatigue} ⇒ ${updated.data.fatigue}`
		},
	})

	useCharacterUpdateCommand({
		name: "currency",
		description: "Adjust currency",
		options: (t) => ({
			currency: t.integer("The amount to adjust", { required: true }),
		}),
		getSelectPlaceholder: (options) =>
			`Select characters to adjust currency by ${options.currency}`,
		update: async (character, options) => {
			const updated = await character.update({
				currency: character.data.currency + options.currency,
			})
			return `${character.data.name}: ${character.data.currency} ⇒ ${updated.data.currency}`
		},
	})

	// let currentUpdates: Partial<Character> | undefined

	// const characterUpdateInteraction = useCharacterInteraction({
	// 	selectCustomId: "update:characters",
	// 	async onSubmit(characters) {
	// 		if (!currentUpdates) {
	// 			return {
	// 				content: `Oops, it looks like this command expired. Try again.`,
	// 			}
	// 		}

	// 		const updates = currentUpdates
	// 		currentUpdates = undefined

	// 		for (const character of characters) {
	// 			await updateCharacter({
	// 				id: character.id,
	// 				health: updates.health ?? character.health,
	// 				fatigue: updates.fatigue ?? character.fatigue,
	// 				currency: updates.currency ?? character.currency,
	// 			})
	// 		}

	// 		const contentLines = arrayFromGenerator(function* () {
	// 			for (const character of characters) {
	// 				yield `Updated **${character.name}**:`
	// 				for (const key of objectKeys(updates)) {
	// 					const prev = character[key]
	// 					const next = updates[key]
	// 					if (next !== undefined) {
	// 						yield `- ${startCase(key)}: ${prev} -> **${next}**`
	// 					}
	// 				}
	// 			}
	// 		})

	// 		if (contentLines.length === 0) {
	// 			return { content: "No changes made." }
	// 		}

	// 		return { content: contentLines.join("\n") }
	// 	},
	// })

	// useSlashCommand({
	// 	name: "heal",
	// 	description: "Gain health",
	// 	options: (t) => ({
	// 		health: t.integer("The amount to heal", { required: true }),
	// 		character: t.string("The character to heal", {
	// 			autocomplete: autocompleteCharacter,
	// 		}),
	// 	}),
	// 	run: async ({ interaction, options }) => {
	// 		currentUpdates = {
	// 			health: requirePositiveInteger(options, "health"),
	// 		}
	// 		await characterUpdateInteraction.handleInteraction(
	// 			interaction,
	// 			options.character,
	// 			`Select characters to heal for ${options.health} health`,
	// 		)
	// 	},
	// })

	// useSlashCommand({
	// 	name: "damage",
	// 	description: "Deal damage",
	// 	options: (t) => ({
	// 		damage: t.integer("The damage amount", { required: true }),
	// 		character: t.string("The character to damage", {
	// 			autocomplete: autocompleteCharacter,
	// 		}),
	// 	}),
	// 	run: async ({ interaction, options }) => {
	// 		currentUpdates = {
	// 			health: -requirePositiveInteger(options, "damage"),
	// 		}
	// 		await characterUpdateInteraction.handleInteraction(
	// 			interaction,
	// 			options.character,
	// 			`Select characters to deal ${options.damage} damage`,
	// 		)
	// 	},
	// })
}

function useCharacterUpdateCommand<Options extends OptionRecord>({
	name,
	description,
	options,
	getSelectPlaceholder,
	update,
}: {
	name: string
	description: string
	options: (t: typeof optionTypes) => Options
	getSelectPlaceholder: (options: OptionValues<Options>) => string
	update: (character: CharacterModel, options: OptionValues<Options>) => Promise<string>
}) {
	useGuildSlashCommand({
		name,
		description,
		options,
		run: async ({ options, guild, isGameMaster, getInteractingUserCharacter }) => {
			if (!isGameMaster) {
				const character = await getInteractingUserCharacter()
				if (!character) {
					throw new InteractionResponse(
						"You don't have a character assigned. Ask the GM to assign one to you!",
					)
				}
				return await update(character, options)
			}

			const characters = await db.character
				.findMany({
					where: { guildId: guild.id },
				})
				.then((characters) => characters.map((c) => new CharacterModel(c)))

			currentOptions = options

			return {
				components: [
					select.render({
						options: characters.map((c) => ({
							label: c.data.name,
							value: c.data.id,
						})),
						minValues: 1,
						maxValues: characters.length,
						placeholder: getSelectPlaceholder(options),
					}),
				],
			}
		},
	})

	let currentOptions: OptionValues<Options> | undefined

	const select = useStringSelect({
		customId: `${name}:characters`,
		async onSelect(interaction) {
			if (!interaction.inGuild()) {
				await interaction.update({
					content: `This menu only works in servers.`,
					embeds: [],
					components: [],
				})
				return
			}

			if (!currentOptions) {
				await interaction.update({
					content: `Oops, it looks like this command expired. Try again.`,
					embeds: [],
					components: [],
				})
				return
			}

			const options = currentOptions
			currentOptions = undefined

			const characters = await db.character
				.findMany({
					where: { id: { in: interaction.values }, guildId: interaction.guildId },
				})
				.then((characters) => characters.map((c) => new CharacterModel(c)))

			const lines = []
			for (const character of characters) {
				const output = await update(character, options)
				lines.push(`- ${output}`)
			}
			await interaction.update({
				content: `Updated characters:\n${lines.join("\n")}`,
				embeds: [],
				components: [],
			})
		},
	})
}

function requireNumber(input: string) {
	const value = Number(input.trim())
	if (isNaN(value)) {
		throw new InteractionResponse(`${inlineCode(input)} is not a number.`)
	}
	return value
}

function requirePositiveInteger<K extends string>(options: Record<K, number>, key: K) {
	const value = options[key]
	if (!(Number.isInteger(value) && value > 0)) {
		throw new InteractionResponse(`${key} must be a positive integer.`)
	}
	return value
}

function adjust(value: number, input: string | null) {
	if (!input) {
		return undefined
	}
	if (input.startsWith("+")) {
		return value + requireNumber(input.replace(/^\+/, ""))
	}
	if (input.startsWith("-")) {
		return value - requireNumber(input.replace(/^-/, ""))
	}
	return requireNumber(input)
}
