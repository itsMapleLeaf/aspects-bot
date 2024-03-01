import type { NonEmptyArray } from "../types.js"

export function isNonEmptyArray<T>(value: T[]): value is NonEmptyArray<T> {
	return value.length > 0
}
