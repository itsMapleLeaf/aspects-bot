import type { ApplicationCommandOptionChoiceData } from "discord.js"
import { toChoices } from "../discord/commands/toChoices.js"
import { expect } from "../helpers/expect.js"
import { randomItem } from "../helpers/random.js"

export class GameTable<const Key extends string, const Value> {
	readonly items: Readonly<Record<Key, Value>>

	constructor(items: Readonly<Record<Key, Value>>) {
		this.items = items
	}

	*keys(): Generator<Key, void, undefined> {
		yield* Object.keys(this.items).toSorted() as Key[]
	}

	*values(): Generator<Value, void, undefined> {
		yield* Object.values<Value>(this.items)
	}

	*entries(): Generator<readonly [Key, Value], void, undefined> {
		for (const key of this.keys()) {
			yield [key, this.items[key]]
		}
	}

	choices(): ApplicationCommandOptionChoiceData<Key>[] {
		return toChoices(this.keys())
	}

	randomKey(): Key {
		return expect(randomItem(this.keys()), "No keys in collection")
	}

	randomValue(): Value {
		return expect(randomItem(this.values()), "No items in collection")
	}

	getValue(key: string): Value {
		return expect(this.items[key as Key], `No item with key "${key}"`)
	}

	hasKey(key: string): key is Key {
		return key in this.items
	}
}
