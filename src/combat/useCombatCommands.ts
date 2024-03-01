import { inlineCode } from "discord.js"
import { InteractionResponse } from "../discord/commands/InteractionResponse.js"
import { useGameMasterSlashCommand } from "../discord/commands/useGameMasterSlashCommand.js"
import { raise } from "../helpers/errors.js"
import { CombatStateModel } from "./CombatStateModel.js"
import { useCombatSetup } from "./useCombatSetup.js"
import { useCombatTracker } from "./useCombatTracker.js"

export function useCombatCommands() {
	const setup = useCombatSetup()
	const tracker = useCombatTracker()

	useGameMasterSlashCommand({
		name: "combat",
		description: "Start combat",
		async run({ guild }) {
			const state = await CombatStateModel.get(guild.id)
			if (state) {
				return { ...(await tracker.render(state)), ephemeral: false }
			}
			return { ...(await setup.render()), ephemeral: false }
		},
	})

	useGameMasterSlashCommand({
		name: "combat-tracker",
		description: "Show combat tracker",
		async run({ interaction }) {
			const guild =
				interaction.guild ??
				raise(new InteractionResponse("Sorry, you can't use that in direct messages."))

			const state =
				(await CombatStateModel.get(guild.id)) ??
				raise(
					new InteractionResponse(
						`Combat is not active. Run ${inlineCode("/combat")} to begin combat.`,
					),
				)

			return { ...(await tracker.render(state)), ephemeral: false }
		},
	})
}
