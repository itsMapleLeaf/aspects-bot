import chalk from "chalk"
import Color from "colorjs.io"
import prettyMilliseconds from "pretty-ms"
import { jsonStringifySafe } from "./helpers/json.ts"
import { Awaitable } from "./types.ts"

function defineLogFunction(
	hue: number,
	prefix: string,
	writeText: (...args: unknown[]) => void,
) {
	const chroma = 0.1
	const lightness = 0.7

	const base = createChalkColor(new Color("oklch", [lightness, chroma, hue]))
	const dim = createChalkColor(
		new Color("oklch", [lightness * 0.4, chroma * 0.8, hue]),
	)
	const highlighted = createChalkColor(
		new Color("oklch", [lightness * 1.15, chroma, hue]),
	).bold

	const log = (constants: TemplateStringsArray, ...dynamics: unknown[]) => {
		writeText(log.getText(constants, ...dynamics))
	}

	log.getText = (constants: TemplateStringsArray, ...dynamics: unknown[]) => {
		const output = []
		for (let i = 0; i < constants.length; i++) {
			output.push(base(constants[i]))
			if (i < dynamics.length) {
				const value =
					typeof dynamics[i] === "string"
						? dynamics[i]
						: jsonStringifySafe(dynamics[i])
				output.push(highlighted(value))
			}
		}
		return `${dim(prefix)} ${output.join("")}`
	}

	return log

	function clamp(value: number, min: number, max: number) {
		return Math.min(max, Math.max(min, value))
	}

	function createChalkColor(color: Color) {
		const { r, g, b } = color.srgb
		return chalk.rgb(
			Math.round(clamp(r, 0, 1) * 255),
			Math.round(clamp(g, 0, 1) * 255),
			Math.round(clamp(b, 0, 1) * 255),
		)
	}
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
		prefix: string,
		callback: () => Awaitable<T>,
	): Promise<LoggerPromiseResult<T>> {
		Logger.info`${prefix} ...`

		const start = Date.now()
		let result: LoggerPromiseResult<T>

		try {
			result = [await callback(), undefined]
		} catch (error: unknown) {
			result = [undefined, error == null ? new Error("Unknown error") : error]
		}

		const duration = prettyMilliseconds(Date.now() - start)
		if (result[1] === undefined) {
			Logger.success`${prefix} succeeded in ${duration}`
		} else {
			const stack = getErrorStack(result[1])
			Logger.error`${prefix} failed in ${duration}ms. ${stack}`
		}

		return result

		function getErrorStack(value: unknown) {
			const error = value instanceof Error ? value : new Error(String(value))
			return error.stack || error.message
		}
	},
}
