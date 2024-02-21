import { APIEmbed, CommandInteraction } from "discord.js"
import { eq } from "drizzle-orm"
import { db } from "../db.ts"
import { CommandError } from "../discord/commands/CommandError.ts"
import { SlashCommand } from "../discord/commands/SlashCommand.ts"
import { SlashCommandGroup } from "../discord/commands/SlashCommandGroup.ts"
import {
	diceKinds,
	getAspect,
	getAttribute,
	getRace,
	listAspectSkills,
	listAspects,
	listAttributes,
	listGeneralSkills,
	listRaces,
} from "../game-data.ts"
import { raise } from "../helpers/errors.ts"
import { aspects, characters, races } from "../schema.ts"

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

export const charactersCommand = new SlashCommandGroup(
	"characters",
	"Manage your characters",
	[
		SlashCommand.create({
			name: "create",
			description:
				"Create a new character. Most options will be generated if not provided.",
			options: {
				name: SlashCommand.string("The character's name"),
				player: SlashCommand.user.optional("The player of the character"),
				race: SlashCommand.string.optional("The character's race", {
					choices: raceChoices,
				}),
				aspect: SlashCommand.string.optional("The character's aspect", {
					choices: aspectChoices,
				}),
				secondary_attribute: SlashCommand.string.optional(
					"The character's secondary attribute",
					{ choices: attributeChoices },
				),
			},
			run: async (options, interaction) => {
				const race = options.race
					? await getRace(options.race)
					: randomItem(await listRaces())

				const aspects = await listAspects()
				const aspect = options.aspect
					? await getAspect(options.aspect)
					: randomItem(aspects)

				const attributes = await listAttributes()

				const secondaryAttribute = options.secondary_attribute
					? await getAttribute(options.secondary_attribute)
					: randomItem(attributes.filter((a) => a.id !== aspect.attributeId))

				const attributeDice = Object.fromEntries(
					attributes.map((attribute) => [
						attribute.id,
						attribute.id === aspect.attributeId
							? "d8"
							: attribute.id === secondaryAttribute.id
							? "d6"
							: "d4",
					]),
				)

				const strengthAttributeDie = attributeDice["strength"]
				const maxHealth = diceKinds.get(strengthAttributeDie)!.faces * 2
				const health = maxHealth

				const character = db
					.insert(characters)
					.values({
						id: crypto.randomUUID(),
						name: options.name,
						player: options.player?.username,
						raceId: race.id,
						aspectId: aspect.id,
						health,
						maxHealth,
						fatigue: 0,
					})
					.returning()
					.get()

				await interaction.reply({
					content: "Character created!",
					embeds: [createCharacterEmbed({ ...character, race, aspect })],
					ephemeral: true,
				})
			},
		}),

		SlashCommand.create({
			name: "view",
			description: "View a character's details",
			options: {
				character: SlashCommand.string.optional("The character to view"),
			},
			run: async (options, interaction) => {
				const character = await getInteractionCharacter(
					options.character,
					interaction,
				)
				await interaction.reply({
					embeds: [createCharacterEmbed(character)],
					ephemeral: true,
				})
			},
		}),

		SlashCommand.create({
			name: "update",
			description: "Set a character's attribute, skill, or aspect",
			options: {
				name: SlashCommand.string.optional("The character to modify"),
				health: SlashCommand.integer.optional("The character's health"),
				max_health: SlashCommand.integer.optional("The character's max health"),
				fatigue: SlashCommand.integer.optional("The character's fatigue"),
			},
			run: async (options, interaction) => {
				const character = await getInteractionCharacter(
					options.name,
					interaction,
				)

				await db
					.update(characters)
					.set({
						health: options.health ?? character.health,
						maxHealth: options.max_health ?? character.maxHealth,
						fatigue: options.fatigue ?? character.fatigue,
					})
					.where(eq(characters.id, character.id))

				const updated =
					(await db.query.characters.findFirst({
						where: eq(characters.id, character.id),
						with: { race: true, aspect: true },
					})) ?? raise("Unexpected: updated character not found")

				await interaction.reply({
					content: "Character updated!",
					embeds: [createCharacterEmbed(updated)],
					ephemeral: true,
				})
			},
		}),
	],
)

async function getInteractionCharacter(
	characterId: string | null | undefined,
	interaction: CommandInteraction,
) {
	const where = characterId
		? eq(characters.id, characterId)
		: eq(characters.player, interaction.user.username)

	const character = await db.query.characters.findFirst({
		where,
		with: {
			race: true,
			aspect: true,
		},
	})

	return character ?? raise(new CommandError("Couldn't find that character."))
}

function createCharacterEmbed(
	character: typeof characters.$inferSelect & {
		race: typeof races.$inferSelect
		aspect: typeof aspects.$inferSelect
	},
): APIEmbed {
	return {
		title: character.name,
		fields: [
			{ name: "Player", value: character.player ?? "no one yet" },
			{ name: "Race", value: character.race.name },
			{ name: "Aspect", value: character.aspect.name },
			// {
			// 	name: "Attributes",
			// 	value: Object.entries(character.attributes)
			// 		.map(([name, dice]) => `${name}: ${dice}`)
			// 		.join("\n"),
			// },
			{
				name: "Health",
				value: `${character.health}/${character.maxHealth}`,
			},
			{ name: "Fatigue", value: `${character.fatigue}` },
		].filter(Boolean),
	}
}

function randomItem<T>(items: Iterable<T>): T {
	const array = [...items]
	if (array.length === 0) throw new Error("No items to choose from")
	return array[Math.floor(Math.random() * array.length)]
}
