import type * as Discord from "discord.js"
import { CharacterModel } from "../../characters/CharacterModel.js"
import { isGameMaster } from "../../config.js"
import type { StrictOmit } from "../../types.js"
import type { CommandReply } from "./CommandStore.js"
import { InteractionResponse } from "./InteractionResponse.js"
import {
	useSlashCommand,
	type OptionRecord,
	type OptionValues,
	type SlashCommandArgs,
} from "./useSlashCommand.js"

export type GuildSlashCommandArgs<Options extends OptionRecord> = StrictOmit<
	SlashCommandArgs<Options>,
	"run"
> & {
	run: (args: {
		interaction: Discord.ChatInputCommandInteraction
		options: OptionValues<Options>
		guild: Discord.Guild
		member: Discord.GuildMember
		isGameMaster: boolean
		getCharacter(characterId: string): Promise<CharacterModel | null>
		getPlayerCharacter(playerId: string): Promise<CharacterModel | null>
		getInteractingUserCharacter(): Promise<CharacterModel | null>
	}) => Promise<CommandReply>
}

export function useGuildSlashCommand<Options extends OptionRecord>(
	commandArgs: GuildSlashCommandArgs<Options>,
) {
	return useSlashCommand({
		...commandArgs,
		run: async (args) => {
			if (!args.interaction.inGuild()) {
				throw new InteractionResponse("This command can only be used in servers.")
			}

			const guild = await args.interaction.client.guilds.fetch(args.interaction.guildId)
			const member = await guild.members.fetch(args.interaction.user.id)

			async function getCharacter(characterId: string) {
				return await CharacterModel.getById(characterId)
			}

			async function getPlayerCharacter(playerId: string) {
				return await CharacterModel.getByPlayer({
					guildId: guild.id,
					playerId,
				})
			}

			async function getInteractingUserCharacter() {
				return await CharacterModel.getByPlayer({
					guildId: guild.id,
					playerId: args.interaction.user.id,
				})
			}

			return await commandArgs.run({
				...args,
				guild,
				member,
				isGameMaster: isGameMaster(member),
				getCharacter,
				getPlayerCharacter,
				getInteractingUserCharacter,
			})
		},
	})
}
