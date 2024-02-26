import { Falsy } from "../types.ts"

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

export function* exclude<T>(exclusions: Iterable<T>, iterable: Iterable<T>) {
	const set = new Set(exclusions)
	yield* excludeWhere(iterable, (value) => set.has(value))
}

export function* take<T>(count: number, iterable: Iterable<T>) {
	let index = 0
	for (const value of iterable) {
		index += 1
		if (index > count) break
		yield value
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
