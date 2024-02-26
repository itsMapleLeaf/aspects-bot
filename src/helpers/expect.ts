import { Logger } from "../logger.ts"

/**
 * Raises an error if the value is null or undefined.
 */
export function expect<T>(value: T | undefined | null, message?: string): T {
	if (value != null) {
		return value
	}
	const error = new Error(message ?? "Expected a non nullish value.")
	Error.captureStackTrace(error, expect)
	throw error
}

/**
 * Logs a warning if the value is null or undefined.
 */
export function expectSoft<T>(value: T, message: string): T {
	if (value == null) {
		Logger.warn(`${expectSoft.name} failed: ${message}`)
	}
	return value
}
