export function* objectKeys<T extends object>(obj: T) {
	for (const key in obj) yield key
}

export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]) {
	const copy = { ...obj }
	for (const key of keys) {
		delete copy[key]
	}
	return copy as Omit<T, K>
}
