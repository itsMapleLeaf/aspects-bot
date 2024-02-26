import { dedent } from "ts-dedent"
import * as Discord from "discord.js"
import { ButtonStyle } from "discord.js"
import { db } from "../db.ts"
import { InteractionHandler } from "../discord/interactions/InteractionHandler.ts"
import { ButtonMatcher } from "../discord/messageComponents/ButtonMatcher.ts"
import { StringSelectMatcher } from "../discord/messageComponents/StringSelectMatcher.ts"
import { buttonRow } from "../discord/messageComponents/buttonRow.ts"
import { getAttributeDice, getMaxHealth } from "../characters/CharacterData.ts"
import { raise } from "../helpers/errors.ts"
import { joinTruthy } from "../helpers/string.ts"
import { expectSoft } from "../helpers/expect.ts"
import {
	CombatState,
	advanceCombat,
	endCombat,
	getCombatState,
	rewindCombat,
} from "./CombatState.ts"
import { CommandError } from "../discord/commands/CommandError.ts"

const advanceButton = new ButtonMatcher("combatTracker:advance")
const rewindButton = new ButtonMatcher("combatTracker:rewind")
const endCombatButton = new ButtonMatcher("combatTracker:endCombat")
const dismissButton = new ButtonMatcher("combatSetup:dismiss")

class CombatTracker implements InteractionHandler {
	async render(
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
				participant.initiative,
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
						style: ButtonStyle.Secondary,
					}),
					advanceButton.render({
						label: "Advance",
						emoji: "⏩",
						style: ButtonStyle.Primary,
					}),
					endCombatButton.render({
						label: "End Combat",
						emoji: "⏹️",
						style: ButtonStyle.Danger,
					}),
				]),
			],
		}
	}

	async handleInteraction(interaction: Discord.Interaction) {
		if (!interaction.inGuild()) return

		if (advanceButton.matches(interaction)) {
			const state =
				(await getCombatState({ id: interaction.guildId })) ??
				raise(new CommandError("Combat isn't running!"))

			await interaction.update(await this.render(await advanceCombat(state)))
		}

		if (rewindButton.matches(interaction)) {
			const state =
				(await getCombatState({ id: interaction.guildId })) ??
				raise(new CommandError("Combat isn't running!"))

			await interaction.update(await this.render(await rewindCombat(state)))
		}

		if (endCombatButton.matches(interaction)) {
			await endCombat({ id: interaction.guildId })
			await interaction.update({
				content: "Combat has ended.",
				embeds: [],
				components: [
					buttonRow([
						dismissButton.render({
							label: "Dismiss",
							style: ButtonStyle.Secondary,
						}),
					]),
				],
			})
		}

		if (dismissButton.matches(interaction)) {
			await interaction.deferUpdate()
			await interaction.deleteReply()
		}
	}
}

export const combatTracker = new CombatTracker()
