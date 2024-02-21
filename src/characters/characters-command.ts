import { SlashCommand } from "../discord/commands/SlashCommand.ts"
import { SlashCommandGroup } from "../discord/commands/SlashCommandGroup.ts"
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

export const charactersCommand = new SlashCommandGroup(
	"characters",
	"Manage your characters",
	[
		SlashCommand.create({
			name: "create",
			description:
				"Create a new character. Omitted options will be randomized.",
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
				const character = await CharacterModel.create({
					name: options.name,
					player: options.player?.username ?? interaction.user.username,
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

		SlashCommand.create({
			name: "view",
			description: "View a character's details",
			options: {
				name: SlashCommand.string.optional("The character to view"),
			},
			run: async (options, interaction) => {
				const character = options.name
					? await CharacterModel.fromCharacterId(options.name)
					: await CharacterModel.fromPlayer(interaction.user.username)
				await interaction.reply({
					embeds: [character.embed],
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
				fatigue: SlashCommand.integer.optional("The character's fatigue"),
			},
			run: async (options, interaction) => {
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
