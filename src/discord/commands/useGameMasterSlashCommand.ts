import * as Discord from "discord.js"
import { InteractionResponse } from "./InteractionResponse.ts"
import { type GuildSlashCommandArgs, useGuildSlashCommand } from "./useGuildSlashCommand.ts"
import type { OptionRecord } from "./useSlashCommand.ts"

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
