import * as Discord from "discord.js"
import { dedent } from "ts-dedent"
import { InteractionResponse } from "../discord/commands/InteractionResponse.js"
import { buttonRow, useButton } from "../discord/messageComponents/useButton.js"
import { raise } from "../helpers/errors.js"
import { joinTruthy } from "../helpers/string.js"
import { CombatStateModel } from "./CombatStateModel.js"

export function useCombatTracker() {
	const advanceButton = useButton({
		customId: "combatTracker:advance",
		async onClick(interaction) {
			const guild =
				interaction.guild ??
				raise(new InteractionResponse("Sorry, this command can only be used in a server."))

			const state =
				(await CombatStateModel.get(guild.id)) ??
				raise(new InteractionResponse("Combat isn't running!"))

			await interaction.update(await render(await state.advance()))
		},
	})

	const rewindButton = useButton({
		customId: "combatTracker:rewind",
		async onClick(interaction) {
			const guild =
				interaction.guild ??
				raise(new InteractionResponse("Sorry, this command can only be used in a server."))

			const state =
				(await CombatStateModel.get(guild.id)) ??
				raise(new InteractionResponse("Combat isn't running!"))

			await interaction.update(await render(await state.rewind()))
		},
	})

	const endCombatButton = useButton({
		customId: "combatTracker:endCombat",
		async onClick(interaction) {
			const guild =
				interaction.guild ??
				raise(new InteractionResponse("Sorry, this command can only be used in a server."))

			await CombatStateModel.delete(guild.id)

			const response = await interaction.update({
				content: "Combat has ended.",
				components: [],
				embeds: [],
			})

			await sleep(5000)
			await response.delete()
		},
	})

	async function render(state: CombatStateModel | undefined): Promise<Discord.BaseMessageOptions> {
		if (!state) {
			return {
				content: "Combat is inactive. Run `/combat start` to begin combat.",
			}
		}

		if (!state.currentMember) {
			return {
				content: dedent`
					Huh, that's weird. It doesn't look like there are any combat participants.
					Try running ${Discord.inlineCode("/combat start")} again.
				`,
			}
		}

		const currentCharacterName = Discord.bold(state.currentMember.character.data.name)

		const currentPlayerPing =
			state.currentMember.character.data.player?.id ?
				Discord.userMention(state.currentMember.character.data.player.id)
			:	""

		const descriptionParts = state.members.map((member) => {
			let name = member.character.data.name
			if (state.currentMember?.characterId === member.characterId) {
				name = Discord.bold(name)
			}

			const attributeDie = member.character.attributes[state.initiativeAttributeId]

			const initiative = joinTruthy(" ⇒ ", [
				attributeDie && `d${attributeDie}`,
				Discord.bold(String(member.initiative)),
			])

			const health = Discord.bold(`${member.character.health}/${member.character.maxHealth}`)

			const fatigue = Discord.bold(`${member.character.data.fatigue}`)
			const aspectName = Discord.bold(`${member.character.data.aspectId}`)

			return dedent`
				${member.character.race.emoji} ${name} (${initiative})
				${health} HP • ${fatigue} FP • ${aspectName}
			`
		})

		const round = Discord.bold(String(state.data.round))
		const initiativeAttributeName = Discord.bold(state.initiativeAttributeId)

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
