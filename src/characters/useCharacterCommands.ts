import { Interaction, PermissionFlagsBits } from "discord.js"
import { startCase } from "lodash-es"
import { db } from "../db.ts"
import { InteractionResponse } from "../discord/commands/InteractionResponse.ts"
import { useSlashCommand } from "../discord/commands/useSlashCommand.ts"

import { roll } from "../dice/roll.ts"
import { raise } from "../helpers/errors.ts"
import { arrayFromGenerator, exclude } from "../helpers/iterable.ts"
import { objectKeys } from "../helpers/object.ts"
import { randomItem } from "../helpers/random.ts"
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

export async function useCharacterCommands() {
	const raceChoices = (await db.race.findMany()).map((race) => ({
		name: race.name,
		value: race.id,
	}))

	const aspectChoices = (await db.attribute.findMany()).map((attribute) => ({
		name: attribute.aspectName,
		value: attribute.aspectId,
	}))

	const skillChoices = [
		...(await db.generalSkill.findMany()),
		...(await db.aspectSkill.findMany()),
	].map((skill) => ({
		name: skill.name,
		value: skill.id,
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
					skip: roll(count),
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
					skip: roll(count),
				})
				raceId = race.id
			}

			let secondaryAttributeId = options.secondary_attribute
			if (!secondaryAttributeId) {
				const count = (await db.attribute.count()) - 1
				const secondaryAttribute = await db.attribute.findFirstOrThrow({
					where: { NOT: { id: aspectAttributeId } },
					skip: roll(count),
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
				name: name,
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
		name: "update",
		description: "Set a character's attribute, skill, or aspect",
		options: (t) => ({
			character: t.string("The character to update. Omit to use your own", {
				autocomplete: autocompleteCharacter,
			}),
			health: t.integer("The character's health"),
			fatigue: t.integer("The character's fatigue"),
			notes: t.integer("The character's notes (currency) amount"),
		}),
		run: async ({ interaction, options }) => {
			const character = await getInteractionCharacter(
				options.character,
				interaction,
			)

			await updateCharacter({
				id: character.id,
				health: options.health ?? character.health,
				fatigue: options.fatigue ?? character.fatigue,
				currency: options.notes ?? character.currency,
			})

			const diffLines = arrayFromGenerator(function* () {
				for (let key of objectKeys(options)) {
					if (key === "character") continue
					const next = options[key]
					const prev = character[key === "notes" ? "currency" : key]
					if (prev !== next && next != null) {
						yield `- ${startCase(key)}: ${prev} -> **${next}**`
					}
				}
			})

			if (diffLines.length === 0) {
				await interaction.reply({
					content: "No changes made.",
					ephemeral: true,
				})
				return
			}

			const isServerAdmin =
				interaction.inCachedGuild() &&
				interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)

			await interaction.reply({
				content: [`Updated **${character.name}**:`, ...diffLines].join("\n"),
				allowedMentions: { users: [], roles: [] },

				// temporary: make this private when called by the gm
				// ideally, this'll later be based on a character visibility setting
				ephemeral: isServerAdmin,
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
