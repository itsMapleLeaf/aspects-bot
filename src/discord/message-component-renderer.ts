import * as Discord from "discord.js"
import { StrictOmit } from "../types.ts"

interface RendererInternal {
	handleInteraction: (
		interaction: Discord.MessageComponentInteraction,
	) => unknown
}

interface Renderer<Args extends unknown[]> extends RendererInternal {
	render: (...args: Args) => Promise<Discord.BaseMessageOptions>
}

type RendererResult = StrictOmit<Discord.BaseMessageOptions, "components"> & {
	components: ActionRowComponent[]
}

type ActionRowComponent = {
	data: Discord.ActionRowData<Discord.MessageActionRowComponentData>
	handleInteraction: (
		interaction: Discord.MessageComponentInteraction,
	) => Promise<boolean | undefined>
}

export function createMessageComponentRenderer<Args extends unknown[]>(
	render: (...args: Args | []) => Promise<RendererResult>,
): Renderer<Args> {
	return {
		render: async (...args: Args): Promise<Discord.BaseMessageOptions> => {
			const result = await render(...args)
			const components = result.components.map((row) => row.data)
			return { ...result, components }
		},
		handleInteraction: async (
			interaction: Discord.MessageComponentInteraction,
		) => {
			const result = await render()
			for (const row of result.components) {
				if (await row.handleInteraction(interaction)) break
			}
		},
	}
}

export function useMessageComponents(
	client: Discord.Client,
	renderers: RendererInternal[],
) {
	client.on("interactionCreate", async (interaction) => {
		if (!interaction.isMessageComponent()) return
		for (const renderer of renderers) {
			await renderer.handleInteraction(interaction)
		}
	})
}

export function buttonRow(buttons: Button[]): ActionRowComponent {
	return {
		data: {
			type: Discord.ComponentType.ActionRow,
			components: buttons.map((button) => button.data),
		},
		handleInteraction: async (interaction) => {
			if (!interaction.isButton()) return

			const button = buttons.find(
				(button) => button.data.customId === interaction.customId,
			)
			if (!button) return

			await button?.onInteraction(interaction)
			return true
		},
	}
}

interface Button {
	data: Discord.InteractionButtonComponentData
	onInteraction: (interaction: Discord.ButtonInteraction) => unknown
}

export function button({
	onInteraction,
	...args
}: StrictOmit<Discord.InteractionButtonComponentData, "type"> & {
	onInteraction: (interaction: Discord.ButtonInteraction) => unknown
}): Button {
	return {
		data: { ...args, type: Discord.ComponentType.Button },
		onInteraction,
	}
}

type StringSelectMenuArgs = StrictOmit<
	Discord.StringSelectMenuComponentData,
	"type"
> & {
	onInteraction: (interaction: Discord.StringSelectMenuInteraction) => unknown
}

export function stringSelectMenu({
	onInteraction,
	...args
}: StringSelectMenuArgs): ActionRowComponent {
	return {
		data: {
			type: Discord.ComponentType.ActionRow,
			components: [
				{
					...args,
					type: Discord.ComponentType.StringSelect,
				},
			],
		},
		handleInteraction: async (interaction) => {
			if (!interaction.isStringSelectMenu()) return
			await onInteraction(interaction)
			return true
		},
	}
}
