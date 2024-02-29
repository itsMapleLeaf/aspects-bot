import * as Discord from "discord.js"

export const messageComponentStore = new (class MessageComponentContext {
	#handlers = new Map<
		string,
		(interaction: Discord.MessageComponentInteraction) => Promise<void>
	>()

	addHandler(
		customId: string,
		handler: (
			interaction: Discord.MessageComponentInteraction,
		) => Promise<void>,
	) {
		this.#handlers.set(customId, handler)
	}

	addListeners(client: Discord.Client) {
		client.on("interactionCreate", async (interaction) => {
			if (!interaction.isMessageComponent()) return
			const handleInteraction = this.#handlers.get(interaction.customId)
			await handleInteraction?.(interaction)
		})
	}
})()
