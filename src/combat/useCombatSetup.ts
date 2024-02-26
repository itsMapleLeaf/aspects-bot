import { BaseMessageOptions, ButtonStyle } from "discord.js"
import { getAttributeDice } from "../characters/CharacterData.ts"
import { db } from "../db.ts"
import { roll } from "../dice/roll.ts"
import { buttonRow, useButton } from "../discord/messageComponents/useButton.ts"
import { useStringSelect } from "../discord/messageComponents/useStringSelect.ts"
import { expectSoft } from "../helpers/expect.ts"
import { exclude, map, take } from "../helpers/iterable.ts"
import { startCombat } from "./CombatState.ts"
import { useCombatTracker } from "./useCombatTracker.ts"

const defaultInitiativeAttributeId = "mobility"

export function useCombatSetup() {
	const characterSelect = useStringSelect({
		customId: "combatSetup:characters",
		async onSelect(interaction) {
			await interaction.update(
				await render({
					characterIds: interaction.values,
					initiativeAttributeId: initiativeAttributeSelect.getSelectedValues(
						interaction.message,
					)[0],
				}),
			)
		},
	})

	const initiativeAttributeSelect = useStringSelect({
		customId: "combatSetup:initiativeAttribute",
		async onSelect(interaction) {
			await interaction.update(
				await render({
					characterIds: characterSelect.getSelectedValues(interaction.message),
					initiativeAttributeId: interaction.values[0],
				}),
			)
		},
	})

	const startButton = useButton({
		customId: "combatSetup:start",
		async onClick(interaction) {
			if (!interaction.inGuild()) {
				await interaction.reply({
					content: "Sorry, this command can only be used in a guild.",
					ephemeral: true,
				})
				return
			}

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
		},
	})

	const combatTracker = useCombatTracker()

	async function render(
		args: {
			characterIds?: Iterable<string> | undefined
			initiativeAttributeId?: string | undefined
		} = {},
	): Promise<BaseMessageOptions> {
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
			exclude(selectedCharacterIds).from(map(characters, (c) => c.id)),
		)

		const selected = new Set([...selectedCharacterIds, ...extraParticipants])

		return {
			content: "",
			embeds: [],
			components: [
				characterSelect.render({
					placeholder: "Select characters",
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
					minValues: 1,
					maxValues: 1,
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

	return { render }
}
