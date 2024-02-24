import { Interaction, PermissionFlagsBits } from "discord.js"
import { eq, ne, sql } from "drizzle-orm"
import { startCase } from "lodash-es"
import { db } from "../db.ts"
import { CommandError } from "../discord/commands/CommandError.ts"
import { optionTypes as t } from "../discord/slash-command-option.ts"
import { defineSlashCommand } from "../discord/slash-command.ts"
import {
	listAspectSkills,
	listAspects,
	listAttributes,
	listGeneralSkills,
	listRaces,
} from "../game-data.ts"
import { raise } from "../helpers/errors.ts"
import { expect } from "../helpers/expect.ts"
import { randomItem } from "../helpers/random.ts"
import { aspectsTable, attributesTable, racesTable } from "../schema.ts"
import {
	createCharacter,
	getCharacter,
	updateCharacter,
} from "./CharacterData.ts"
import { createCharacterMessage } from "./characterMessage.ts"
import { characterNames } from "./characterNames.ts"
import { characterOption } from "./characterOption.ts"

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

export const characterCommands = [
	defineSlashCommand({
		name: "create",
		description: "Create a character. Leave values blank to generate them.",
		data: {
			defaultMemberPermissions: [PermissionFlagsBits.ManageGuild],
		},
		options: {
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
		},
		run: async (interaction, options) => {
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

			const character = await createCharacter({
				name: options.name ?? randomItem(characterNames),
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
	}),

	defineSlashCommand({
		name: "show",
		aliases: ["view", "info"],
		description: "Show character details",
		options: {
			character: characterOption("The character to show. Omit to use your own"),
			public: t.boolean("Show the character to everyone. Private by default."),
		},
		run: async (interaction, options) => {
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
	}),

	defineSlashCommand({
		name: "set",
		aliases: ["update"],
		description: "Set a character's attribute, skill, or aspect",
		options: {
			character: characterOption(
				"The character to update. Omit to use your own",
			),
			health: t.integer("The character's health"),
			fatigue: t.integer("The character's fatigue"),
			notes: t.integer("The character's notes (currency) amount"),
		},
		run: async (interaction, options) => {
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
	}),

	defineSlashCommand({
		name: "assign",
		description: "Assign a character to a player",
		options: {
			character: t.required(characterOption()),
			player: t.required(t.user("The player to assign the character to")),
		},
		data: {
			defaultMemberPermissions: [PermissionFlagsBits.ManageGuild],
		},
		run: async (interaction, options) => {
			const character = await getCharacter({
				characterId: options.character,
			})

			if (!character) {
				throw new CommandError("Sorry, I couldn't find that character.")
			}

			await updateCharacter(character.id, {
				playerDiscordId: options.player.id,
			})

			await interaction.reply({
				content: `Assigned **${character.name}** to <@${options.player.id}>.`,
				allowedMentions: { users: [], roles: [] },
			})
		},
	}),
]

async function getInteractionCharacter(
	characterId: string | null,
	interaction: Interaction,
) {
	if (characterId) {
		const character = await getCharacter({ characterId })
		return (
			character ??
			raise(new CommandError("Sorry, I couldn't find that character."))
		)
	}

	const character = await getCharacter({
		discordUser: interaction.user,
	})
	return (
		character ?? raise(new CommandError("You don't have a character assigned."))
	)
}
