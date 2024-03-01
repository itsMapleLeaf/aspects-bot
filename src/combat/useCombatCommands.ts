import { inlineCode } from "discord.js"
import { InteractionResponse } from "../discord/commands/InteractionResponse.ts"
import { useGameMasterSlashCommand } from "../discord/commands/useGameMasterSlashCommand.ts"
import { raise } from "../helpers/errors.ts"
import { CombatStateModel } from "./CombatStateModel.ts"
import { useCombatSetup } from "./useCombatSetup.ts"
import { useCombatTracker } from "./useCombatTracker.ts"

export function useCombatCommands() {
	const setup = useCombatSetup()
	const tracker = useCombatTracker()

	useGameMasterSlashCommand({
		name: "combat",
		description: "Start combat",
		async run() {
			return setup.render()
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

			return await tracker.render(state)
		},
	})
}
