import {
	defineSlashCommand,
	defineSlashCommandGroup,
	optional,
	stringOption,
	userOption,
} from "../discord/slash-command.ts"

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
				player: optional(userOption("The player of the character")),
				race: optional(stringOption("The character's race")),
				aspect: optional(stringOption("The character's aspect")),
				"secondary attribute": optional(
					stringOption("The character's secondary attribute"),
				),
				"first skill": optional(stringOption("The character's first skill")),
				"second skill": optional(stringOption("The character's second skill")),
			},
			run: async (options, interaction) => {
				const character = {
					name: options.name,
					player: options.player?.username,
				}
			},
		}),
	],
)
