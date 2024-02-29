import { Character } from "@prisma/client"
import { BaseMessageOptions, ChatInputCommandInteraction } from "discord.js"
import { isGameMaster } from "../config.ts"
import { db } from "../db.ts"
import { InteractionResponse } from "../discord/commands/InteractionResponse.ts"
import { useStringSelect } from "../discord/messageComponents/useStringSelect.ts"
import { raise } from "../helpers/errors.ts"
import { Nullish } from "../types.ts"
import { findCharacterById, findCharacterByPlayerId } from "./CharacterData.ts"

export function useCharacterInteraction(args: {
	selectCustomId: string
	onSubmit: (characters: Character[]) => Promise<BaseMessageOptions>
}) {
	async function handleInteraction(
		interaction: ChatInputCommandInteraction,
		characterId: Nullish<string>,
		selectPlaceholder: string,
	) {
		if (!interaction.guildId) {
			throw new InteractionResponse(
				"Sorry, this command only works in servers.",
			)
		}

		const guild = await interaction.client.guilds.fetch(interaction.guildId)
		const member = await guild.members.fetch(interaction.user)
		const isGM = isGameMaster(member)
		let character: Character | undefined

		// if character is not given and the user is a player, use their character
		if (!characterId && !isGM) {
			character =
				(await findCharacterByPlayerId(interaction.user.id)) ??
				raise(new InteractionResponse("You don't have a character assigned."))
		}

		// if character is given and the user is a player, return an error
		else if (characterId && !isGM) {
			throw new InteractionResponse(
				"Sorry, you can only heal your own character.",
			)
		}

		// if the character is given and the user is a gm, heal that character
		else if (characterId && isGM) {
			character =
				(await findCharacterById(characterId)) ??
				raise(new InteractionResponse("Sorry, I couldn't find that character."))
		}

		if (character) {
			await interaction.reply({
				ephemeral: true,
				...(await args.onSubmit([character])),
			})
		} else {
			const characters = await db.character.findMany()
			await interaction.reply({
				ephemeral: true,
				components: [
					select.render({
						placeholder: selectPlaceholder,
						options: characters.map((c) => ({
							label: c.name,
							value: c.id,
						})),
						minValues: 1,
						maxValues: characters.length,
					}),
				],
			})
		}
	}

	const select = useStringSelect({
		customId: args.selectCustomId,
		onSelect: async (interaction) => {
			const characters = await db.character.findMany({
				where: { id: { in: interaction.values } },
			})
			await interaction.update({
				content: "",
				components: [],
				embeds: [],
				...(await args.onSubmit(characters)),
			})
		},
	})

	return { handleInteraction }
}
