import * as Discord from "discord.js"
import { Context } from "../../helpers/Context.ts"

export const MessageComponentContext = new Context((client: Discord.Client) => {
	const handlers = new Map<
		string,
		(interaction: Discord.MessageComponentInteraction) => Promise<void>
	>()

	client.on("interactionCreate", async (interaction) => {
		if (!interaction.isMessageComponent()) return
		const handleInteraction = handlers.get(interaction.customId)
		await handleInteraction?.(interaction)
	})

	return { handlers }
})
