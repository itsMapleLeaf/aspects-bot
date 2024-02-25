import { PermissionFlagsBits } from "discord.js"
import {
	defineSlashCommand,
	defineSlashCommandGroup,
} from "../discord/slash-command.ts"
import { participantSelector } from "./participantSelector.ts"

export const combatCommands = [
	defineSlashCommandGroup("combat", "Manage combat", [
		defineSlashCommand({
			name: "start",
			description: "Start combat",
			options: {},
			data: {
				defaultMemberPermissions: [PermissionFlagsBits.ManageGuild],
			},
			async run(interaction, options) {
				await interaction.reply({
					...(await participantSelector.render()),
					ephemeral: true,
				})
			},
		}),
	]),
]
