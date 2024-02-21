export function jsonStringifySafe(value: unknown, space: string | number = 2) {
	try {
		return JSON.stringify(value, null, space)
	} catch {
		return String(value)
	}
}
