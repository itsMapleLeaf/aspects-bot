import {
	defineSlashCommand,
	defineSlashCommandGroup,
	stringOption,
	userOption,
} from "../discord/slash-command.ts"
import {
	aspects,
	aspectSkills,
	attributes,
	generalSkills,
	races,
} from "../game-data.ts"

const raceChoices = [...races.values()].map((race) => ({
	name: race.name,
	value: race.id,
}))

const aspectChoices = [...aspects.values()].map((aspect) => ({
	name: aspect.name,
	value: aspect.id,
}))

const skillChoices = [...generalSkills.values(), ...aspectSkills.values()].map((
	skill,
) => ({
	name: skill.name,
	value: skill.id,
}))

const attributeChoices = [...attributes.values()].map((attribute) => ({
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
				"Create a new character. Most options will be generated if not provided.",
			options: {
				name: stringOption("The character's name"),
				player: userOption("The player of the character"),
				race: stringOption("The character's race", raceChoices),
				aspect: stringOption("The character's aspect", aspectChoices),
				secondary_attribute: stringOption(
					"The character's secondary attribute",
					attributeChoices,
				),
			},
			run: async (options, interaction) => {
				const race = races.get(options.race)!
				const aspect = aspects.get(options.aspect)!
				const aspectAttribute = aspect.attribute
				const secondaryAttribute = attributes.get(
					options.secondary_attribute,
				)!

				const character = {
					name: options.name,
					player: options.player?.username,
					race: options.race,
					aspect: options.aspect,
					attributes: Object.fromEntries(
						[...attributes.values()].map((attribute) => [
							attribute.id,
							attribute.id === aspectAttribute.id
								? "d8"
								: attribute.id === secondaryAttribute.id
								? "d6"
								: "d4",
						]),
					),
				}

				console.log(character)

				await interaction.reply({
					content: `Done.`,
					ephemeral: true,
				})
			},
		}),
	],
)
