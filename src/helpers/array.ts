import type { NonEmptyArray } from "../types.ts"

export function isNonEmptyArray<T>(value: T[]): value is NonEmptyArray<T> {
	return value.length > 0
}
