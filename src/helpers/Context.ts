const empty = Symbol()

export class Context<InitArgs extends unknown[], Value> {
	#value: Value | typeof empty = empty
	#init

	constructor(init: (...args: InitArgs) => Value) {
		this.#init = init
	}

	provide(...args: InitArgs): Disposable {
		const previous = this.#value
		this.#value = this.#init(...args)
		return {
			[Symbol.dispose]: () => {
				this.#value = previous
			},
		}
	}

	use(): Value {
		if (this.#value === empty) {
			const error = new Error("Context not provided")
			Error.captureStackTrace(error, this.use)
			throw error
		}
		return this.#value
	}
}
