import { db } from "../db.ts"
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
import { characters } from "../schema.ts"

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

				const character: typeof characters.$inferInsert = {
					id: crypto.randomUUID(),
					name: options.name,
					player: options.player?.username,
					raceId: race.id,
					aspectId: aspect.id,
					health,
					maxHealth,
					fatigue: 0,
				}
				await db.insert(characters).values(character)

				const characterEmbed = {
					title: character.name,
					fields: [
						{ name: "Player", value: character.player ?? "no one yet" },
						{ name: "Race", value: race.name },
						{ name: "Aspect", value: aspect.name },
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
						{ name: "Fatigue", value: character.fatigue.toString() },
					],
				}

				await interaction.reply({
					content: "Character created!",
					embeds: [characterEmbed],
					ephemeral: true,
				})
			},
		}),
	],
)

function randomItem<T>(items: Iterable<T>): T {
	const array = [...items]
	if (array.length === 0) throw new Error("No items to choose from")
	return array[Math.floor(Math.random() * array.length)]
}
