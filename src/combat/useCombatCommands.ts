import { PermissionFlagsBits, inlineCode } from "discord.js"
import { InteractionResponse } from "../discord/commands/InteractionResponse.ts"
import { useSlashCommandGroup } from "../discord/commands/useSlashCommandGroup.ts"
import { raise } from "../helpers/errors.ts"
import { getCombatState } from "./CombatState.ts"
import { useCombatSetup } from "./useCombatSetup.ts"
import { useCombatTracker } from "./useCombatTracker.ts"

export function useCombatCommands() {
	const setup = useCombatSetup()
	const tracker = useCombatTracker()

	useSlashCommandGroup("combat", "Manage combat", (group) => {
		group.add({
			name: "start",
			description: "Start combat",
			defaultMemberPermissions: [PermissionFlagsBits.ManageGuild],
			async run({ interaction }) {
				await interaction.reply(await setup.render())
			},
		})

		group.add({
			name: "status",
			description: "Show combat tracker",
			async run({ interaction }) {
				const guild =
					interaction.guild ??
					raise(
						new InteractionResponse(
							"Sorry, you can't use that in direct messages.",
						),
					)

				const state =
					(await getCombatState(guild)) ??
					raise(
						new InteractionResponse(
							`Combat is not active. Run ${inlineCode(
								"/combat start",
							)} to begin combat.`,
						),
					)

				await interaction.reply(await tracker.render(state))
			},
		})
	})
}
