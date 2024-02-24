export function expect<T>(value: T | undefined | null, message?: string): T {
	if (value != null) {
		return value
	}
	const error = new Error(message ?? "Expected a non nullish value.")
	Error.captureStackTrace(error, expect)
	throw error
}
