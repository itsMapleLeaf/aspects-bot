import type { Awaitable } from "../types.js"

export async function callTimedAsync<T>(fn: () => Awaitable<T>) {
	const start = Date.now()
	const result = await fn()
	const end = Date.now()
	return [end - start, result] as const
}
