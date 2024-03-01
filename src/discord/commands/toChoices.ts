import type { ApplicationCommandOptionChoiceData } from "discord.js"
import { map } from "../../helpers/iterable.ts"

export function toChoices<T extends string | number>(
	items: Iterable<T>,
	getName?: (value: T) => string,
): ApplicationCommandOptionChoiceData<T>[] {
	return [
		...map(items, (value) => ({
			name: getName?.(value) ?? String(value),
			value,
		})),
	]
}
