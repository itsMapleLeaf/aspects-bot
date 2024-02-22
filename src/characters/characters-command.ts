import { PermissionFlagsBits } from "discord.js"
import { startCase } from "lodash-es"
import { CommandError } from "../discord/commands/CommandError.ts"
import { optionTypes } from "../discord/slash-command-option.ts"
import { defineSlashCommand } from "../discord/slash-command.ts"
import {
	listAspectSkills,
	listAspects,
	listAttributes,
	listGeneralSkills,
	listRaces,
} from "../game-data.ts"
import { CharacterModel } from "./CharacterModel.ts"
import { characterOption } from "./character-option.ts"

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
		description: "Create a new character. Omitted options will be randomized.",
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
				playerDiscordId: options.player?.id ?? null,
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
		name: "show",
		description: "Show character details",
		options: {
			name: characterOption("The character to show. Omit to use your own"),
			public: optionTypes.boolean(
				"Show the character to everyone. Private by default.",
			),
		},
		run: async (interaction, options) => {
			const character = options.name
				? await CharacterModel.fromCharacterId(options.name)
				: await CharacterModel.fromPlayer(interaction.user)

			if (!character) {
				throw new CommandError(
					options.name
						? "Couldn't find that character."
						: "You don't have a character assigned.",
				)
			}

			await interaction.reply({
				embeds: [character.embed],
				ephemeral: !options.public,
			})
		},
	}),

	defineSlashCommand({
		name: "set",
		description: "Set a character's attribute, skill, or aspect",
		options: {
			name: characterOption("The character to update. Omit to use your own"),
			health: optionTypes.integer("The character's health"),
			fatigue: optionTypes.integer("The character's fatigue"),
		},
		run: async (interaction, options) => {
			const character = options.name
				? await CharacterModel.fromCharacterId(options.name)
				: await CharacterModel.fromPlayer(interaction.user)

			if (!character) {
				throw new CommandError(
					options.name
						? "Couldn't find that character."
						: "You don't have a character assigned.",
				)
			}

			const prevData = character.data

			await character.update({
				health: options.health ?? character.data.health,
				fatigue: options.fatigue ?? character.data.fatigue,
			})

			const diffLines = Object.entries(character.data)
				.map(([key, value]) => {
					const prev = prevData[key as keyof typeof prevData]
					if (prev !== value) {
						return `- ${startCase(key)}: ${prev} -> **${value}**`
					}
				})
				.filter(Boolean)

			await interaction.reply({
				content: [`Updated **${character.data.name}**:`, ...diffLines].join(
					"\n",
				),
			})
		},
	}),

	defineSlashCommand({
		name: "assign",
		description: "Assign a character to a player",
		options: {
			name: optionTypes.required(characterOption()),
			player: optionTypes.required(
				optionTypes.user("The player to assign the character to"),
			),
		},
		data: {
			defaultMemberPermissions: [PermissionFlagsBits.ManageGuild],
		},
		run: async (interaction, options) => {
			const character = await CharacterModel.fromCharacterId(options.name)

			await character.update({
				playerDiscordId: options.player.id,
			})

			await interaction.reply({
				content: `Assigned **${character.data.name}** to <@${options.player.id}>.`,
				allowedMentions: { users: [], roles: [] },
			})
		},
	}),
]
