import { db } from "../db.ts"

export async function autocompleteCharacter(input: string) {
	const results = await db.character.findMany({
		...(input && {
			where: {
				name: {
					contains: input,
				},
			},
		}),
		orderBy: { name: "asc" },
	})

	return results.map((c) => ({
		name: c.name,
		value: c.id,
	}))
}
