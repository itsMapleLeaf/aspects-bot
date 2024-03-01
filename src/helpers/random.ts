import type { NonEmptyArray } from "../types.ts"

export function randomInt(...args: [max: number] | [min: number, max: number]) {
	const [min, max] = args.length === 1 ? [0, args[0]] : args
	return Math.floor(Math.random() * (max - min + 1)) + min
}

export function randomItem<T extends Iterable<unknown>>(items: T) {
	const array = [...items]
	return array[Math.floor(Math.random() * array.length)] as RandomItemOf<T>
}

type RandomItemOf<T extends Iterable<unknown>> =
	T extends NonEmptyArray<infer Value>
		? Value
		: T extends Iterable<infer Value>
			? Value | undefined
			: never
