import { Interaction, PermissionFlagsBits } from "discord.js"
import { eq, ne, sql } from "drizzle-orm"
import { startCase } from "lodash-es"
import { db } from "../db.ts"
import { InteractionResponse } from "../discord/commands/InteractionResponse.ts"
import { useSlashCommand } from "../discord/commands/useSlashCommand.ts"
import {
	listAspectSkills,
	listAspects,
	listAttributes,
	listGeneralSkills,
	listRaces,
} from "../game-data.ts"
import { raise } from "../helpers/errors.ts"
import { expect } from "../helpers/expect.ts"
import { exclude } from "../helpers/iterable.ts"
import { randomItem } from "../helpers/random.ts"
import {
	aspectsTable,
	attributesTable,
	charactersTable,
	racesTable,
} from "../schema.ts"
import {
	createCharacter,
	getCharacter,
	setPlayerCharacter,
	updateCharacter,
} from "./CharacterData.ts"
import { createCharacterMessage } from "./characterMessage.ts"
import { characterNames } from "./characterNames.ts"

const raceChoices = (await listRaces()).map((race) => ({
	name: race.name,
	value: race.id,
}))

const aspectChoices = (await listAspects()).map((aspect) => ({
	name: aspect.name,
	value: aspect.id,
}))

const skillChoices = [
	...(await listGeneralSkills()),
	...(await listAspectSkills()),
].map((skill) => ({
	name: skill.name,
	value: skill.id,
}))

const attributeChoices = [...(await listAttributes())].map((attribute) => ({
	name: attribute.name,
	value: attribute.id,
}))

export function useCharacterCommands() {
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
				(await db.query.charactersTable.findFirst({
					where: (fields, ops) => ops.eq(fields.name, options.name as string),
				}))

			if (existing) {
				throw new InteractionResponse(
					`Oops, I already found a character named "${options.name}". Try again with a different name.`,
				)
			}

			let aspectId = options.aspect
			let aspect: { id: string; attributeId: string } | undefined
			if (!aspectId) {
				aspect = db
					.select({
						id: aspectsTable.id,
						attributeId: aspectsTable.attributeId,
					})
					.from(aspectsTable)
					.orderBy(sql`random()`)
					.limit(1)
					.get()
				aspectId = expect(aspect).id
			}

			let raceId = options.race
			if (!raceId) {
				const race = db
					.select({ id: racesTable.id })
					.from(racesTable)
					.orderBy(sql`random()`)
					.limit(1)
					.get()
				raceId = expect(race).id
			}

			let secondaryAttributeId = options.secondary_attribute
			if (!secondaryAttributeId) {
				aspect ??= db
					.select({
						id: aspectsTable.id,
						attributeId: aspectsTable.attributeId,
					})
					.from(aspectsTable)
					.where((fields) => eq(fields.id, aspectId))
					.get()

				const aspectAttributeId = expect(aspect).attributeId

				const secondaryAttribute = db
					.select({ id: attributesTable.id })
					.from(attributesTable)
					.where((fields) => ne(fields.id, aspectAttributeId))
					.orderBy(sql`random()`)
					.limit(1)
					.get()

				secondaryAttributeId = expect(secondaryAttribute).id
			}

			const existingCharacters = await db.query.charactersTable.findMany()

			const availableCharacterNames = exclude(
				existingCharacters.map((c) => c.name),
			).from(characterNames)

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
				playerDiscordId: options.player?.id ?? null,
				aspectId,
				raceId,
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

			const prevData = { ...character }

			const updated = await updateCharacter(character.id, {
				health: options.health ?? character.health,
				fatigue: options.fatigue ?? character.fatigue,
				currency: options.notes ?? character.currency,
			})

			const diffLines = Object.entries(updated)
				.map(([key, value]) => {
					const prev = prevData[key as keyof typeof prevData]
					if (prev !== value) {
						return `- ${startCase(key)}: ${prev} -> **${value}**`
					}
				})
				.filter(Boolean)

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
			const character = await getCharacter({
				characterId: options.character,
			})

			if (!character) {
				throw new InteractionResponse("Sorry, I couldn't find that character.")
			}

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
		const character = await getCharacter({ characterId })
		return (
			character ??
			raise(new InteractionResponse("Sorry, I couldn't find that character."))
		)
	}

	const character = await getCharacter({
		discordUser: interaction.user,
	})
	return (
		character ??
		raise(new InteractionResponse("You don't have a character assigned."))
	)
}

async function autocompleteCharacter(input: string) {
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
}
