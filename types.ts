export type Awaitable<T> = T | PromiseLike<T>

export type NonNullableWhen<Condition, T> = Condition extends true
  ? NonNullable<T>
  : T
