import { db } from "../db.ts"
import { optionTypes } from "../discord/slash-command-option.ts"
import { charactersTable } from "../schema.ts"

export const characterOption = (
	description = "The name or ID of the character",
) =>
	optionTypes.autocomplete(optionTypes.string(description), async (input) => {
		const results = await db.query.charactersTable.findMany({
			...(input && {
				where: (cols, ops) => ops.like(cols.name, `%${input}%`),
			}),
			orderBy: [charactersTable.name],
		})

		return results.map((c) => ({
			name: c.name,
			value: c.id,
		}))
	})
