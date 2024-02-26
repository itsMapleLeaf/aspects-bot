const empty = Symbol()

export function createContext<Value, ProvideArgs>(
	init: (args: ProvideArgs) => Value,
) {
	let current: Value | typeof empty = empty

	function provide(args: ProvideArgs) {
		const previous = current
		current = init(args)
		return {
			[Symbol.dispose]() {
				current = previous
			},
		}
	}

	function use() {
		if (current === empty) {
			throw new Error("Context not provided")
		}
		return current
	}

	return { provide, use }
}
