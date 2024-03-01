import type { Falsy } from "../types.js"

export function joinTruthy<T>(separator: string, items: Iterable<T | Falsy>) {
	return [...items].filter(Boolean).join(separator)
}
