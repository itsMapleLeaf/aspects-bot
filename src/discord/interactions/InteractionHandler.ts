import * as Discord from "discord.js"

export interface InteractionHandler {
	handleInteraction: (interaction: Discord.Interaction) => Promise<void>
}

export function useInteractionHandlers(
	client: Discord.Client,
	handlers: InteractionHandler[],
) {
	client.on("interactionCreate", async (interaction) => {
		for (const renderer of handlers) {
			await renderer.handleInteraction(interaction)
		}
	})
}
