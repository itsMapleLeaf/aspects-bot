import * as Discord from "discord.js"
import { InteractionResponse } from "./InteractionResponse.js"
import { useGuildSlashCommand, type GuildSlashCommandArgs } from "./useGuildSlashCommand.js"
import type { OptionRecord } from "./useSlashCommand.js"

export function useGameMasterSlashCommand<Options extends OptionRecord>(
	commandArgs: GuildSlashCommandArgs<Options>,
) {
	return useGuildSlashCommand({
		...commandArgs,
		defaultMemberPermissions: [Discord.PermissionFlagsBits.ManageGuild],
		run: async (args) => {
			if (!args.isGameMaster) {
				throw new InteractionResponse("You do not have permission to use this command.")
			}
			return await commandArgs.run(args)
		},
	})
}
