const empty = Symbol()

export function createContext<Value, ProvideArgs>(
	init: (args: ProvideArgs) => Value,
) {
	let current: Value | typeof empty = empty
	return {
		provide(args: ProvideArgs, block: () => void) {
			const previous = current
			current = init(args)
			block()
			current = previous
		},
		use() {
			if (current === empty) {
				throw new Error("No context provider")
			}
			return current
		},
	}
}
