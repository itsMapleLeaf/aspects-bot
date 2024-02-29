import { Character } from "@prisma/client"
import { Interaction, PermissionFlagsBits, inlineCode } from "discord.js"
import { startCase } from "lodash-es"
import { db } from "../db.ts"
import { InteractionResponse } from "../discord/commands/InteractionResponse.ts"
import { useSlashCommand } from "../discord/commands/useSlashCommand.ts"
import { raise } from "../helpers/errors.ts"
import { arrayFromGenerator, exclude } from "../helpers/iterable.ts"
import { objectKeys } from "../helpers/object.ts"
import { randomInt, randomItem } from "../helpers/random.ts"
import {
	createCharacter,
	findCharacterById,
	findCharacterByPlayerId,
	setPlayerCharacter,
	updateCharacter,
} from "./CharacterData.ts"
import { autocompleteCharacter } from "./autocompleteCharacter.ts"
import { createCharacterMessage } from "./characterMessage.ts"
import { characterNames } from "./characterNames.ts"
import { useCharacterInteraction } from "./useCharacterInteraction.ts"

export async function useCharacterCommands() {
	const raceChoices = (await db.race.findMany()).map((race) => ({
		name: race.name,
		value: race.id,
	}))

	const aspectChoices = (await db.attribute.findMany()).map((attribute) => ({
		name: attribute.aspectName,
		value: attribute.aspectId,
	}))

	const attributeChoices = [...(await db.attribute.findMany())].map(
		(attribute) => ({
			name: attribute.name,
			value: attribute.id,
		}),
	)

	useSlashCommand({
		name: "create",
		description: "Create a character. Leave values blank to generate them.",
		defaultMemberPermissions: [PermissionFlagsBits.ManageGuild],
		options: (t) => ({
			name: t.string("The character's name"),
			player: t.user("The player of the character"),
			race: t.string("The character's race", { choices: raceChoices }),
			aspect: t.string("The character's aspect", { choices: aspectChoices }),
			secondary_attribute: t.string("The character's initial d6 attribute", {
				choices: attributeChoices,
			}),
			fatigue: t.integer("The character's starting fatigue"),
			notes: t.integer(
				"The amount of notes (currency) the character starts with",
			),
		}),
		run: async ({ interaction, options }) => {
			const existing =
				options.name &&
				(await db.character.findFirst({
					where: { name: options.name },
				}))

			if (existing) {
				throw new InteractionResponse(
					`Oops, I already found a character named "${options.name}". Try again with a different name.`,
				)
			}

			let aspectAttributeId: string
			if (!options.aspect) {
				const count = await db.attribute.count()
				const aspectAttribute = await db.attribute.findFirstOrThrow({
					skip: randomInt(count),
				})
				aspectAttributeId = aspectAttribute.id
			} else {
				const attribute = await db.attribute.findFirstOrThrow({
					where: { aspectId: options.aspect },
				})
				aspectAttributeId = attribute.id
			}

			let raceId = options.race
			if (!raceId) {
				const count = await db.race.count()
				const race = await db.race.findFirstOrThrow({
					skip: randomInt(count),
				})
				raceId = race.id
			}

			let secondaryAttributeId = options.secondary_attribute
			if (!secondaryAttributeId) {
				const count = (await db.attribute.count()) - 1
				const secondaryAttribute = await db.attribute.findFirstOrThrow({
					where: { NOT: { id: aspectAttributeId } },
					skip: randomInt(count),
				})

				secondaryAttributeId = secondaryAttribute.id
			}

			const existingCharacters = await db.character.findMany()

			const availableCharacterNames = exclude(
				characterNames,
				existingCharacters.map((c) => c.name),
			)

			const name = options.name ?? randomItem(availableCharacterNames)
			if (!name) {
				throw new InteractionResponse(
					[
						`Oh sheesh, it looks like I ran out of names.`,
						`You'll have to pass one manually. Sorry!`,
					].join("\n"),
				)
			}

			const character = await createCharacter({
				name,
				raceId,
				aspectAttributeId,
				secondaryAttributeId,
				fatigue: options.fatigue ?? undefined,
				currency: options.notes ?? undefined,
			})

			await interaction.reply({
				content: `Character created!\n${createCharacterMessage(character)}`,
				ephemeral: true,
			})
		},
	})

	useSlashCommand({
		name: "show",
		description: "Show character details",
		options: (t) => ({
			character: t.string("The character to show. Omit to use your own", {
				autocomplete: autocompleteCharacter,
			}),
			public: t.boolean("Show the character to everyone. Private by default."),
		}),
		run: async ({ interaction, options }) => {
			const character = await getInteractionCharacter(
				options.character,
				interaction,
			)
			await interaction.reply({
				content: createCharacterMessage(character),
				ephemeral: !options.public,
				allowedMentions: { users: [], roles: [] },
			})
		},
	})

	useSlashCommand({
		name: "assign",
		description: "Assign a character to a player",
		options: (t) => ({
			character: t.string("The character to assign", {
				required: true,
				autocomplete: autocompleteCharacter,
			}),
			player: t.user("The player to assign the character to", {
				required: true,
			}),
		}),
		defaultMemberPermissions: [PermissionFlagsBits.ManageGuild],
		run: async ({ interaction, options }) => {
			const character =
				(await findCharacterById(options.character)) ??
				raise(new InteractionResponse("Sorry, I couldn't find that character."))

			await setPlayerCharacter(options.player.id, character.id)

			await interaction.reply({
				content: `Assigned **${character.name}** to <@${options.player.id}>.`,
				allowedMentions: { users: [], roles: [] },
			})
		},
	})

	let currentUpdates: Partial<Character> | undefined

	const characterUpdateInteraction = useCharacterInteraction({
		selectCustomId: "update:characters",
		async onSubmit(characters) {
			if (!currentUpdates) {
				return {
					content: `Oops, it looks like this command expired. Try again.`,
				}
			}

			const updates = currentUpdates
			currentUpdates = undefined

			for (const character of characters) {
				await updateCharacter({
					id: character.id,
					health: updates.health ?? character.health,
					fatigue: updates.fatigue ?? character.fatigue,
					currency: updates.currency ?? character.currency,
				})
			}

			const contentLines = arrayFromGenerator(function* () {
				for (const character of characters) {
					yield `Updated **${character.name}**:`
					for (const key of objectKeys(updates)) {
						const prev = character[key]
						const next = updates[key]
						if (next !== undefined) {
							yield `- ${startCase(key)}: ${prev} -> **${next}**`
						}
					}
				}
			})

			if (contentLines.length === 0) {
				return { content: "No changes made." }
			}

			return { content: contentLines.join("\n") }
		},
	})

	useSlashCommand({
		name: "update",
		description: "Set a character's health, fatigue, or notes",
		options: (t) => ({
			character: t.string("The character to update. Omit to use your own", {
				autocomplete: autocompleteCharacter,
			}),
			health: t.integer("The character's health"),
			fatigue: t.integer("The character's fatigue"),
			notes: t.integer("The character's notes (currency) amount"),
		}),
		run: async ({ interaction, options }) => {
			currentUpdates = {
				health: requireOptionalPositiveInteger(options, "health"),
				fatigue: requireOptionalPositiveInteger(options, "fatigue"),
				currency: requireOptionalPositiveInteger(options, "notes"),
			}
			await characterUpdateInteraction.handleInteraction(
				interaction,
				options.character,
				"Select characters to update",
			)
		},
	})

	useSlashCommand({
		name: "heal",
		description: "Gain health",
		options: (t) => ({
			health: t.integer("The amount to heal", { required: true }),
			character: t.string("The character to heal", {
				autocomplete: autocompleteCharacter,
			}),
		}),
		run: async ({ interaction, options }) => {
			currentUpdates = {
				health: requirePositiveInteger(options, "health"),
			}
			await characterUpdateInteraction.handleInteraction(
				interaction,
				options.character,
				`Select characters to heal for ${options.health} health`,
			)
		},
	})

	useSlashCommand({
		name: "damage",
		description: "Deal damage",
		options: (t) => ({
			damage: t.integer("The damage amount", { required: true }),
			character: t.string("The character to damage", {
				autocomplete: autocompleteCharacter,
			}),
		}),
		run: async ({ interaction, options }) => {
			currentUpdates = {
				health: -requirePositiveInteger(options, "damage"),
			}
			await characterUpdateInteraction.handleInteraction(
				interaction,
				options.character,
				`Select characters to deal ${options.damage} damage`,
			)
		},
	})
}

function requireOptionalPositiveInteger<OptionName extends string>(
	options: Record<OptionName, number | null>,
	optionName: OptionName,
) {
	const value = options[optionName]
	if (value == null) {
		return undefined
	}
	if (value < 1) {
		throw new InteractionResponse(
			`${inlineCode(optionName)} must be a positive integer.`,
		)
	}
	return value
}

function requirePositiveInteger<OptionName extends string>(
	options: Record<OptionName, number>,
	optionName: OptionName,
) {
	const value = options[optionName]
	if (value < 1) {
		throw new InteractionResponse(
			`${inlineCode(optionName)} must be a positive integer.`,
		)
	}
	return value
}

async function getInteractionCharacter(
	characterId: string | null,
	interaction: Interaction,
) {
	if (characterId) {
		const character = await findCharacterById(characterId)
		return (
			character ??
			raise(new InteractionResponse("Sorry, I couldn't find that character."))
		)
	}

	const character = await findCharacterByPlayerId(interaction.user.id)
	return (
		character ??
		raise(new InteractionResponse("You don't have a character assigned."))
	)
}
