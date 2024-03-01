import chalk from "chalk"
import Color from "colorjs.io"
import prettyMilliseconds from "pretty-ms"
import { inspect } from "util"
import type { Awaitable } from "./types.ts"

class Formatter {
	base
	dim
	highlight

	constructor(hue: number) {
		const lightness = 0.7
		const chroma = 0.1
		this.base = this.#createChalkColor(new Color("oklch", [0.7, 0.1, hue]))
		this.dim = this.#createChalkColor(
			new Color("oklch", [lightness * 0.4, chroma * 0.8, hue]),
		)
		this.highlight = this.#createChalkColor(
			new Color("oklch", [lightness * 1.15, chroma, hue]),
		).bold
	}

	#createChalkColor(color: Color) {
		const { r, g, b } = color.toGamut("srgb").srgb
		return chalk.rgb(
			Math.round(r * 255),
			Math.round(g * 255),
			Math.round(b * 255),
		)
	}
}

function callOptionalFunction<T, Args extends unknown[]>(
	value: T | ((...args: Args) => T),
	...args: Args
): T {
	return value instanceof Function ? value(...args) : value
}

function defineLogFunction(
	hue: number,
	prefix: string,
	writeText: (prefix: string, message: string) => void,
) {
	const formatter = new Formatter(hue)

	function log(message: string | ((f: Formatter) => string)) {
		writeText(
			formatter.dim(prefix),
			formatter.base(callOptionalFunction(message, formatter)),
		)
	}
	log.formatters = formatter

	return log
}

export type LoggerPromiseResult<T> =
	| readonly [T, undefined]
	| readonly [undefined, NonNullable<unknown>]

export const Logger = {
	info: defineLogFunction(240, "i", console.info),
	success: defineLogFunction(150, "s", console.info),
	warn: defineLogFunction(80, "w", console.warn),
	error: defineLogFunction(10, "e", console.error),

	async async<T>(
		prefix: string | ((f: Formatter) => string),
		callback: () => Awaitable<T>,
	): Promise<LoggerPromiseResult<T>> {
		Logger.info((f) => `${callOptionalFunction(prefix, f)}...`)

		const start = Date.now()
		let result: LoggerPromiseResult<T>

		try {
			result = [await callback(), undefined]
		} catch (error: unknown) {
			result = [undefined, error == null ? new Error("Unknown error") : error]
		}

		const [, error] = result
		const duration = prettyMilliseconds(Date.now() - start)
		if (error === undefined) {
			Logger.success((f) =>
				[
					f.highlight(callOptionalFunction(prefix, f)),
					" succeeded in ",
					f.highlight(duration),
				].join(""),
			)
		} else {
			Logger.error((f) =>
				[
					f.highlight(callOptionalFunction(prefix, f)),
					" failed in ",
					f.highlight(duration),
					". ",
					inspect(error, { depth: 10 }),
				].join(""),
			)
		}

		return result
	},
}
