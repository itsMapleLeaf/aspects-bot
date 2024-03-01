import type { Falsy } from "../types.ts"

export function* map<T, V>(iterable: Iterable<T>, mapper: (value: T) => V) {
	for (const value of iterable) {
		yield mapper(value)
	}
}

export function* filter<T>(
	iterable: Iterable<T>,
	predicate: (value: T) => true | Falsy,
) {
	for (const value of iterable) {
		if (predicate(value)) yield value
	}
}

export function* excludeWhere<T>(
	iterable: Iterable<T>,
	predicate: (value: T) => true | Falsy,
) {
	for (const value of iterable) {
		if (!predicate(value)) yield value
	}
}

export function* exclude<T>(
	fromIterable: Iterable<T>,
	exclusions: Iterable<T>,
): Iterable<T> {
	const set = new Set(exclusions)
	for (const value of fromIterable) {
		if (!set.has(value)) yield value
	}
}

export function* fromGenerator<T>(generator: () => Iterable<T>) {
	yield* generator()
}

export function arrayFromGenerator<T>(generator: () => Iterable<T>) {
	return [...generator()]
}

export function recordFromEntries<
	const Entry extends readonly [PropertyKey, unknown],
>(entries: Iterable<Entry>) {
	return Object.fromEntries(entries) as Record<Entry[0], Entry[1]>
}

export function objectFromGenerator<const K extends PropertyKey, const V>(
	generator: () => Iterable<readonly [K, V]>,
) {
	return Object.fromEntries(generator()) as Record<K, V>
}

export function* take<T>(count: number, iterable: Iterable<T>) {
	let index = 0
	for (const value of iterable) {
		index += 1
		if (index > count) break
		yield value
	}
}

export function first<T>(iterable: Iterable<T>) {
	for (const value of iterable) {
		return value
	}
}

type RangeArgs = [length: number] | [start: number, end: number]

export function* range(...args: RangeArgs) {
	let start, end
	if (args.length === 1) {
		start = 0
		end = args[0]
	} else {
		;[start, end] = args
	}
	for (let i = start; i < end; i++) {
		yield i
	}
}

export function join<T>(iterable: Iterable<T>, separator = "") {
	return [...iterable].join(separator)
}

export function firstWhereReturning<T, V>(
	iterable: Iterable<T>,
	predicate: (value: T) => V | Falsy,
) {
	for (const value of iterable) {
		const result = predicate(value)
		if (result) return result
	}
}

export function keyedBy<Item, Key>(
	iterable: Iterable<Item>,
	key:
		| ((item: Item) => Key)
		| { [K in keyof Item]: Item[K] extends Key ? K : never }[keyof Item],
) {
	const map = new Map<Key, Item>()
	for (const value of iterable) {
		const mapKey =
			typeof key === "function" && key instanceof Function
				? key(value)
				: (value[key] as Key)
		map.set(mapKey, value)
	}
	return map
}
