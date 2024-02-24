import { Falsy } from "../types.ts"

export function firstWhereReturning<T, V>(
	iterable: Iterable<T>,
	predicate: (value: T) => V | Falsy,
) {
	for (const value of iterable) {
		const result = predicate(value)
		if (result) return result
	}
}
