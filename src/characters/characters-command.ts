import { SlashCommand } from "../discord/commands/SlashCommand.ts"
import { SlashCommandGroup } from "../discord/commands/SlashCommandGroup.ts"
import {
	listAspectSkills,
	listAspects,
	listAttributes,
	listGeneralSkills,
	listRaces,
} from "../game-data.ts"
import { Character } from "./character.ts"

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
				player: SlashCommand.user("The player of the character"),
				race: SlashCommand.string("The character's race", {
					choices: raceChoices,
				}),
				aspect: SlashCommand.string("The character's aspect", {
					choices: aspectChoices,
				}),
				secondary_attribute: SlashCommand.string(
					"The character's secondary attribute",
					{ choices: attributeChoices },
				),
			},
			run: async (options, interaction) => {
				let character = await Character.create({
					name: options.name,
					player: options.player?.username,
					race: options.race,
					aspect: options.aspect,
					secondaryAttribute: options.secondary_attribute,
				})
				character = await character.save()

				await interaction.reply({
					embeds: [character.toEmbed()],
					ephemeral: true,
				})
			},
		}),
	],
)
