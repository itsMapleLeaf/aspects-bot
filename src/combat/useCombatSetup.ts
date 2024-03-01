import { type BaseMessageOptions, ButtonStyle } from "discord.js"
import { CharacterModel } from "../characters/CharacterModel.ts"
import { db } from "../db.ts"
import { buttonRow, useButton } from "../discord/messageComponents/useButton.ts"
import { useStringSelect } from "../discord/messageComponents/useStringSelect.ts"
import { Attributes } from "../game/tables.ts"
import { exclude, map, take } from "../helpers/iterable.ts"
import { Logger } from "../logger.ts"
import { CombatStateModel } from "./CombatStateModel.ts"
import { useCombatTracker } from "./useCombatTracker.ts"

const defaultInitiativeAttributeId = "Mobility"

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

			const characters = await db.character
				.findMany({
					where: {
						id: { in: characterSelect.getSelectedValues(interaction.message) },
						guildId: interaction.guildId,
					},
				})
				.then((results) => results.map((data) => new CharacterModel(data)))

			const initiativeAttributeId = parseAttributeId(
				initiativeAttributeSelect.getSelectedValues(interaction.message)[0],
			)

			await interaction.update(
				await combatTracker.render(
					await CombatStateModel.create({
						guildId: interaction.guildId,
						initiativeAttributeId,
						memberCharacters: characters,
					}),
				),
			)
		},
	})

	const combatTracker = useCombatTracker()

	async function render(
		args: {
			characterIds?: Iterable<string> | undefined
			initiativeAttributeId?: string | undefined
		} = {},
	): Promise<BaseMessageOptions> {
		const characters = await db.character.findMany({
			include: {
				player: true,
			},
		})

		const selectedCharacterIds = new Set(
			args.characterIds ?? characters.filter((c) => c.player).map((c) => c.id),
		)

		// ensure we have at least two participants if there aren't enough players
		const extraParticipants = take(
			Math.max(0, 2 - selectedCharacterIds.size),
			exclude(
				map(characters, (c) => c.id),
				selectedCharacterIds,
			),
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
					options: [...Attributes.keys()].map((name) => ({
						label: name,
						value: name,
						default: name === (args.initiativeAttributeId ?? defaultInitiativeAttributeId),
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

function parseAttributeId(
	selectedAttributeId: string | undefined,
): keyof (typeof Attributes)["items"] {
	if (selectedAttributeId === undefined) {
		Logger.warn("No initiative attribute selected. Using default.")
		return defaultInitiativeAttributeId
	}

	if (!Attributes.isKey(selectedAttributeId)) {
		Logger.warn(`Invalid initiative attribute selected: ${selectedAttributeId}. Using default.`)
		return defaultInitiativeAttributeId
	}

	return selectedAttributeId
}
