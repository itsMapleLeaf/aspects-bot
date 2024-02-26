import { PermissionFlagsBits, inlineCode } from "discord.js"
import {
	defineSlashCommand,
	defineSlashCommandGroup,
} from "../discord/slash-command.ts"
import { combatSetup } from "./CombatSetup.ts"
import { combatTracker } from "./CombatTracker.ts"
import { getCombatState } from "./CombatState.ts"
import { raise } from "../helpers/errors.ts"
import { CommandError } from "../discord/commands/CommandError.ts"

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
				await interaction.reply(await combatSetup.render())
			},
		}),

		defineSlashCommand({
			name: "tracker",
			aliases: ["status", "show", "current", "view"],
			description: "Show combat tracker",
			options: {},
			async run(interaction, options) {
				const guild =
					interaction.guild ??
					raise(
						new CommandError("Sorry, you can't use that in direct messages."),
					)

				const state =
					(await getCombatState(guild)) ??
					raise(
						new CommandError(
							`Combat is not active. Run ${inlineCode(
								"/combat start",
							)} to begin combat.`,
						),
					)

				await interaction.reply(await combatTracker.render(state))
			},
		}),
	]),
]
