import * as Discord from "discord.js"
import { StrictOmit } from "../../types.ts"

export class ButtonMatcher {
	readonly customId

	constructor(customId: string) {
		this.customId = customId
	}

	render(
		data: StrictOmit<
			Discord.InteractionButtonComponentData,
			"type" | "customId"
		>,
	): Discord.InteractionButtonComponentData {
		return {
			...data,
			type: Discord.ComponentType.Button,
			customId: this.customId,
		}
	}

	matches(
		interaction: Discord.BaseInteraction,
	): interaction is Discord.ButtonInteraction {
		return interaction.isButton() && interaction.customId === this.customId
	}
}
