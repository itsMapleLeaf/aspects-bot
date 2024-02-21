export type Awaitable<T> = T | PromiseLike<T>

export type NonNullableWhen<Condition, T> = Condition extends true
	? NonNullable<T>
	: T

export type NonEmptyArray<T> = [T, ...T[]]

export type AllKeys<T> = T extends unknown ? keyof T : never

export type StrictOmit<T, K extends AllKeys<T>> = T extends unknown
	? Omit<T, K>
	: never
