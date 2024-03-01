export type Awaitable<T> = T | PromiseLike<T>

export type NonNullableWhen<Condition, T> = Condition extends true ? NonNullable<T> : T

export type NonEmptyArray<T> = [T, ...T[]]

export type AllKeys<T> = T extends unknown ? keyof T : never

export type StrictOmit<T, K extends keyof T> = T extends unknown ? Simplify<Omit<T, K>> : never

export type MaybeArray<T> = T | T[]

export type Falsy = false | 0 | 0n | "" | null | undefined

export type Truthy<T> = Exclude<T, Falsy>

export type Simplify<T> = { [K in keyof T]: T[K] } & {}

export type Override<A extends object, B extends object> = Simplify<Omit<A, keyof B> & B>

export type RequiredKeys<T, K extends keyof T> = Simplify<Required<Pick<T, K>> & StrictOmit<T, K>>

export type OptionalKeys<T, K extends keyof T> = Simplify<Partial<Pick<T, K>> & StrictOmit<T, K>>

export type Nullish<T> = T | null | undefined
