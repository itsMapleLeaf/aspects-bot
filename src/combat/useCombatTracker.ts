import * as Discord from "discord.js"
import { dedent } from "ts-dedent"
import { getAttributeDice, getMaxHealth } from "../characters/CharacterData.ts"
import { db } from "../db.ts"
import { InteractionResponse } from "../discord/commands/InteractionResponse.ts"
import { buttonRow, useButton } from "../discord/messageComponents/useButton.ts"
import { raise } from "../helpers/errors.ts"
import { expectSoft } from "../helpers/expect.ts"
import { joinTruthy } from "../helpers/string.ts"
import {
	CombatState,
	advanceCombat,
	endCombat,
	getCombatState,
	rewindCombat,
} from "./CombatState.ts"

export function useCombatTracker() {
	const advanceButton = useButton({
		customId: "combatTracker:advance",
		async onClick(interaction) {
			const guild =
				interaction.guild ??
				raise(
					new InteractionResponse(
						"Sorry, this command can only be used in a server.",
					),
				)

			const state =
				(await getCombatState(guild)) ??
				raise(new InteractionResponse("Combat isn't running!"))

			await interaction.update(await render(await advanceCombat(state)))
		},
	})

	const rewindButton = useButton({
		customId: "combatTracker:rewind",
		async onClick(interaction) {
			const guild =
				interaction.guild ??
				raise(
					new InteractionResponse(
						"Sorry, this command can only be used in a server.",
					),
				)

			const state =
				(await getCombatState(guild)) ??
				raise(new InteractionResponse("Combat isn't running!"))

			await interaction.update(await render(await rewindCombat(state)))
		},
	})

	const endCombatButton = useButton({
		customId: "combatTracker:endCombat",
		async onClick(interaction) {
			const guild =
				interaction.guild ??
				raise(
					new InteractionResponse(
						"Sorry, this command can only be used in a server.",
					),
				)

			await endCombat(guild)

			const response = await interaction.update({
				content: "Combat has ended.",
				components: [],
				embeds: [],
			})

			await sleep(5000)
			await response.delete()
		},
	})

	async function render(
		state: CombatState | undefined,
	): Promise<Discord.BaseMessageOptions> {
		if (!state) {
			return {
				content: "Combat is inactive. Run `/combat start` to begin combat.",
			}
		}

		const currentParticipant =
			expectSoft(
				state.participants[state.participantIndex],
				`No participant at index ${state.participantIndex}. Using the first participant instead.`,
			) ?? state.participants[0]

		if (!currentParticipant) {
			return {
				content: dedent`
					Huh, that's weird. It doesn't look like there are any combat participants.
					Try running ${Discord.inlineCode("/combat start")} again.
				`,
			}
		}

		const currentCharacterName = Discord.bold(currentParticipant.character.name)

		const currentPlayerPing = currentParticipant.character.player?.discordUserId
			? Discord.userMention(currentParticipant.character.player?.discordUserId)
			: ""

		const attributes = await db.query.attributesTable.findMany()

		const descriptionParts = state.participants.map((participant, index) => {
			const attributeDice = getAttributeDice(participant.character, attributes)

			let name = participant.character.name
			if (state.participantIndex === index) {
				name = Discord.bold(name)
			}

			const attributeDie = attributeDice.get(state.initiativeAttributeId)

			const initiative = joinTruthy(" ⇒ ", [
				attributeDie && `d${attributeDie.die}`,
				Discord.bold(String(participant.initiative)),
			])

			const maxHealth = getMaxHealth(attributeDice)
			const health = Discord.bold(
				`${participant.character.health}/${maxHealth}`,
			)

			const fatigue = Discord.bold(participant.character.fatigue.toString())
			const aspectName = Discord.bold(participant.character.aspect.name)

			return dedent`
				${participant.character.race.emoji} ${name} (${initiative})
				${health} HP • ${fatigue} FP • ${aspectName}
			`
		})

		const round = Discord.bold(String(state.round))
		const initiativeAttributeName = Discord.bold(state.initiativeAttribute.name)

		return {
			content: `${currentCharacterName}, you're up! ${currentPlayerPing}`,
			embeds: [
				{
					title: "⚔️ Combat",
					description: descriptionParts.join("\n\n"),
					fields: [
						// a footer would be a better use for this, but footers don't support markdown :(
						{
							name: " ",
							value: `Round ${round} • ${initiativeAttributeName} initiative`,
						},
					],
				},
			],
			components: [
				buttonRow([
					rewindButton.render({
						label: "Rewind",
						emoji: "⏪",
						style: Discord.ButtonStyle.Secondary,
					}),
					advanceButton.render({
						label: "Advance",
						emoji: "⏩",
						style: Discord.ButtonStyle.Primary,
					}),
					endCombatButton.render({
						label: "End Combat",
						emoji: "⏹️",
						style: Discord.ButtonStyle.Danger,
					}),
				]),
			],
		}
	}

	return { render }
}

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}
