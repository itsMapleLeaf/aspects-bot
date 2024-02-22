import { optionTypes } from "../discord/slash-command-option.ts"
import {
	defineSlashCommand,
	defineSlashCommandGroup,
} from "../discord/slash-command.ts"
import {
	listAspectSkills,
	listAspects,
	listAttributes,
	listGeneralSkills,
	listRaces,
} from "../game-data.ts"
import { CharacterModel } from "./CharacterModel.ts"

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

export const charactersCommand = defineSlashCommandGroup(
	"characters",
	"Manage your characters",
	[
		defineSlashCommand({
			name: "create",
			description:
				"Create a new character. Omitted options will be randomized.",
			options: {
				name: optionTypes.required(optionTypes.string("The character's name")),
				player: optionTypes.user("The player of the character"),
				race: optionTypes.string("The character's race", {
					choices: raceChoices,
				}),
				aspect: optionTypes.string("The character's aspect", {
					choices: aspectChoices,
				}),
				secondary_attribute: optionTypes.string(
					"The character's secondary attribute",
					{ choices: attributeChoices },
				),
			},
			run: async (interaction, options) => {
				const character = await CharacterModel.create({
					name: options.name,
					player: options.player?.username ?? null,
					aspectId: options.aspect,
					raceId: options.race,
					secondaryAttributeId: options.secondary_attribute,
				})

				await interaction.reply({
					content: "Character created!",
					embeds: [character.embed],
					ephemeral: true,
				})
			},
		}),

		defineSlashCommand({
			name: "view",
			description: "View a character's details",
			options: {
				name: optionTypes.string("The character to view"),
			},
			run: async (interaction, options) => {
				const character = options.name
					? await CharacterModel.fromCharacterId(options.name)
					: await CharacterModel.fromPlayer(interaction.user.username)
				await interaction.reply({
					embeds: [character.embed],
					ephemeral: true,
				})
			},
		}),

		defineSlashCommand({
			name: "update",
			description: "Set a character's attribute, skill, or aspect",
			options: {
				name: optionTypes.string("The character to modify"),
				health: optionTypes.integer("The character's health"),
				fatigue: optionTypes.integer("The character's fatigue"),
			},
			run: async (interaction, options) => {
				const character = options.name
					? await CharacterModel.fromCharacterId(options.name)
					: await CharacterModel.fromPlayer(interaction.user.username)

				await character.update({
					health: options.health ?? character.data.health,
					fatigue: options.fatigue ?? character.data.fatigue,
				})

				await interaction.reply({
					content: "Character updated!",
					embeds: [character.embed],
					ephemeral: true,
				})
			},
		}),
	],
)
