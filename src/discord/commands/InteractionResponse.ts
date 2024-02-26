import { InteractionReplyOptions } from "discord.js"

export class InteractionResponse {
	readonly options: InteractionReplyOptions

	constructor(options: string | InteractionReplyOptions) {
		this.options = typeof options === "string" ? { content: options } : options
	}
}
