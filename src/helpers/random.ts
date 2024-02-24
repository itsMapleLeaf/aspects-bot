import { NonEmptyArray } from "../types.ts"

export function randomItem<T extends Iterable<unknown>>(items: T) {
	const array = [...items]
	return [Math.floor(Math.random() * array.length)] as RandomItemOf<T>
}

type RandomItemOf<T extends Iterable<unknown>> = T extends NonEmptyArray<
	infer Value
>
	? Value
	: T extends Iterable<infer Value>
	? Value | undefined
	: never
