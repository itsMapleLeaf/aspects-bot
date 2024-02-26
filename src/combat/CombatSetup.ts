import * as Discord from "discord.js"
import { ButtonStyle } from "discord.js"
import { getAttributeDice } from "../characters/CharacterData.ts"
import { db } from "../db.ts"
import { roll } from "../dice/roll.ts"
import { InteractionHandler } from "../discord/interactions/InteractionHandler.ts"
import { ButtonMatcher } from "../discord/messageComponents/ButtonMatcher.ts"
import { StringSelectMatcher } from "../discord/messageComponents/StringSelectMatcher.ts"
import { buttonRow } from "../discord/messageComponents/buttonRow.ts"
import { expectSoft } from "../helpers/expect.ts"
import { exclude, map, take } from "../helpers/iterable.ts"
import { startCombat } from "./CombatState.ts"
import { combatTracker } from "./CombatTracker.ts"
import { Logger } from "../logger.ts"

const characterSelect = new StringSelectMatcher(
	"participantSelector:characters",
)
const initiativeAttributeSelect = new StringSelectMatcher(
	"participantSelector:initiativeAttribute",
)
const startButton = new ButtonMatcher("participantSelector:start")

const defaultInitiativeAttributeId = "mobility"

class CombatSetup implements InteractionHandler {
	async render(
		args: {
			characterIds?: Iterable<string>
			initiativeAttributeId?: string
		} = {},
	): Promise<Discord.BaseMessageOptions> {
		const characters = await db.query.charactersTable.findMany({
			with: {
				player: true,
			},
		})

		const attributes = await db.query.attributesTable.findMany()

		const selectedCharacterIds = new Set(
			args.characterIds ?? characters.filter((c) => c.player).map((c) => c.id),
		)

		// ensure we have at least two participants if there aren't enough players
		const extraParticipants = take(
			Math.max(0, 2 - selectedCharacterIds.size),
			exclude(
				selectedCharacterIds,
				map(characters, (c) => c.id),
			),
		)

		const selected = new Set([...selectedCharacterIds, ...extraParticipants])

		return {
			content: "",
			embeds: [],
			components: [
				characterSelect.render({
					placeholder: "Select participants",
					minValues: 2,
					maxValues: 25,
					options: characters.map((c) => ({
						label: c.name,
						value: c.id,
						default: selected.has(c.id),
					})),
				}),
				initiativeAttributeSelect.render({
					placeholder: "Select initiative attribute",
					options: attributes.map((a) => ({
						label: a.name,
						value: a.id,
						default:
							a.id ===
							(args.initiativeAttributeId ?? defaultInitiativeAttributeId),
					})),
				}),
				buttonRow([
					startButton.render({
						label: "Start Combat",
						emoji: "⚔️",
						style: ButtonStyle.Primary,
					}),
				]),
			],
		}
	}

	async handleInteraction(interaction: Discord.Interaction) {
		if (!interaction.isMessageComponent()) return
		if (!interaction.inGuild()) return

		if (characterSelect.matches(interaction)) {
			await interaction.update(
				await this.render({
					characterIds: interaction.values,
					initiativeAttributeId: initiativeAttributeSelect.getSelectedValues(
						interaction.message,
					)[0],
				}),
			)
		}

		if (initiativeAttributeSelect.matches(interaction)) {
			await interaction.update(
				await this.render({
					characterIds: characterSelect.getSelectedValues(interaction.message),
					initiativeAttributeId: interaction.values[0],
				}),
			)
		}

		if (startButton.matches(interaction)) {
			const characterIds = characterSelect.getSelectedValues(
				interaction.message,
			)

			const initiativeAttributeId =
				expectSoft(
					initiativeAttributeSelect.getSelectedValues(interaction.message)[0],
					"No initiative attribute selected. Using default.",
				) ?? defaultInitiativeAttributeId

			const characters = await db.query.charactersTable.findMany({
				where: (fields, ops) => ops.inArray(fields.id, characterIds),
				with: { aspect: true },
			})

			const attributes = await db.query.attributesTable.findMany()

			const state = await startCombat({
				guild: { id: interaction.guildId },
				participants: characters.map((character) => {
					const attributeDice = getAttributeDice(character, attributes)

					const initiativeDie =
						expectSoft(
							attributeDice.get(initiativeAttributeId),
							`Character "${character.name}" does not have attribute "${initiativeAttributeId}". Using default.`,
						)?.die ?? 4

					return {
						characterId: character.id,
						initiative: roll(initiativeDie),
					}
				}),
				initiativeAttributeId,
			})

			await interaction.update(await combatTracker.render(state))
		}
	}
}

export const combatSetup = new CombatSetup()
