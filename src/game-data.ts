import * as Notion from "@notionhq/client"
import { QueryDatabaseResponse } from "@notionhq/client/build/src/api-endpoints.js"
import { kebabCase } from "lodash-es"
import { db } from "./db.ts"
import { env } from "./env.ts"
import { first, map } from "./helpers/iterable.ts"
import { Logger } from "./logger.ts"

const notion = new Notion.Client({
	auth: env.NOTION_API_KEY,
})

export async function loadGameData() {
	const [
		racesResponse,
		aspectsResponse,
		attributesResponse,
		generalSkillsResponse,
		aspectSkillsResponse,
	] = await Promise.all([
		notion.databases.query({
			database_id: env.NOTION_RACES_DATABASE_ID,
			filter: {
				property: "Name",
				title: {
					is_not_empty: true,
				},
			},
		}),
		notion.databases.query({
			database_id: env.NOTION_ASPECTS_DATABASE_ID,
		}),
		notion.databases.query({
			database_id: env.NOTION_ATTRIBUTES_DATABASE_ID,
		}),
		notion.databases.query({
			database_id: env.NOTION_GENERAL_SKILLS_DATABASE_ID,
		}),
		notion.databases.query({
			database_id: env.NOTION_ASPECT_SKILLS_DATABASE_ID,
		}),
	])

	await db.$transaction(async (db) => {
		for (const result of DocumentAccessor.responseItems(racesResponse)) {
			const name = result.getPropertyText("Name")

			await db.race.upsert({
				where: { id: kebabCase(name) },
				create: {
					id: kebabCase(name),
					name,
					emoji: result.getEmoji(),
				},
				update: {
					emoji: result.getEmoji(),
				},
			})

			const abilities = result
				.getPropertyText("Abilities")
				.split("\n")
				.map((line) => line.split(/\s-\s/g))
				.map(([name = "", description = ""]) => ({ name, description }))

			for (const ability of abilities) {
				await db.raceAbility.upsert({
					where: { id: kebabCase(ability.name) },
					create: {
						id: kebabCase(ability.name),
						name: ability.name,
						description: ability.description,
						raceId: kebabCase(name),
					},
					update: {
						description: ability.description,
						raceId: kebabCase(name),
					},
				})
			}
		}

		for (const result of DocumentAccessor.responseItems(attributesResponse)) {
			const name = result.getPropertyText("Name")
			const description = result.getPropertyText("Description")

			const aspectDoc = first(
				result.getRelatedDocuments("Aspect", aspectsResponse.results),
			)

			if (!aspectDoc) {
				Logger.error(
					`Attribute "${name}" is missing a related aspect. ${result.json}`,
				)
				continue
			}

			await db.attribute.upsert({
				where: { id: kebabCase(name) },
				create: {
					id: kebabCase(name),
					name,
					description,
					emoji: result.getEmoji(),
					aspectId: kebabCase(aspectDoc.getPropertyText("Name")),
					aspectName: aspectDoc.getPropertyText("Name"),
					aspectDescription: aspectDoc.getPropertyText("Description"),
					aspectEmoji: aspectDoc.getEmoji(),
				},
				update: {
					description,
					emoji: result.getEmoji(),
					aspectName: aspectDoc.getPropertyText("Name"),
					aspectDescription: aspectDoc.getPropertyText("Description"),
					aspectEmoji: aspectDoc.getEmoji(),
				},
			})
		}

		for (const result of DocumentAccessor.responseItems(
			generalSkillsResponse,
		)) {
			const name = result.getPropertyText("Name")
			const description = result.getPropertyText("Description")
			const difficulty = result.getPropertyText("Difficulty")

			const attributeName = first(
				result.getRelatedDocuments("Attribute", attributesResponse.results),
			)?.getPropertyText("Name")

			await db.generalSkill.upsert({
				where: { id: kebabCase(name) },
				create: {
					id: kebabCase(name),
					name,
					description,
					difficulty,
					attributeId: kebabCase(attributeName),
				},
				update: {
					description,
					difficulty,
					attributeId: kebabCase(attributeName),
				},
			})
		}

		for (const result of DocumentAccessor.responseItems(aspectSkillsResponse)) {
			const name = result.getPropertyText("Name")

			const aspectIds = map(
				result.getRelatedDocuments("Aspects", aspectsResponse.results),
				(doc) => kebabCase(doc.getPropertyText("Name")),
			)

			await db.aspectSkill.upsert({
				where: { id: kebabCase(name) },
				create: {
					id: kebabCase(name),
					name,
					aspectAttributes: {
						connect: [...map(aspectIds, (id) => ({ id }))],
					},
				},
				update: {
					aspectAttributes: {
						connect: [...map(aspectIds, (id) => ({ id }))],
					},
				},
			})
		}
	})
}

class DocumentAccessor {
	constructor(
		private readonly data: QueryDatabaseResponse["results"][number],
	) {}

	static *responseItems(data: QueryDatabaseResponse) {
		for (const result of data.results) {
			yield new DocumentAccessor(result)
		}
	}

	get id() {
		return this.data.id
	}

	get json() {
		return JSON.stringify(this.data, null, 2)
	}

	getProperty(name: string) {
		const property = "properties" in this.data && this.data.properties[name]
		if (!property) {
			Logger.warn(`Property "${name}" not found in document: ${this.json}`)
			return undefined
		}
		return property
	}

	getPropertyText(propertyName: string) {
		const property = this.getProperty(propertyName)
		if (!property) return ""

		const richTextItems =
			property &&
			(("rich_text" in property && property.rich_text) ||
				("title" in property && property.title))

		const text =
			Array.isArray(richTextItems) &&
			richTextItems.map((block) => block.plain_text)?.join("")

		if (typeof text !== "string") {
			const info = {
				propertyName,
				property,
				document: this.json,
			}
			Logger.warn(`Failed to parse text. ${JSON.stringify(info, null, 2)}`)
			return ""
		}

		return text
	}

	getEmoji() {
		const icon = "icon" in this.data && this.data.icon
		const emoji = icon && icon.type === "emoji" && icon.emoji
		if (!emoji) {
			const info = {
				icon,
				document: this.json,
			}
			Logger.warn(`Failed to parse emoji. ${JSON.stringify(info, null, 2)}`)
			return
		}
		return emoji
	}

	*getRelatedDocuments(
		propertyName: string,
		documents: QueryDatabaseResponse["results"],
	) {
		const property = this.getProperty(propertyName)

		const relationIds =
			property && "relation" in property && Array.isArray(property.relation)
				? property.relation.map((relation) => relation.id)
				: undefined

		if (!relationIds) {
			const info = {
				propertyName,
				property,
				document: this.json,
			}
			Logger.warn(`Failed to parse relations. ${JSON.stringify(info, null, 2)}`)
			return
		}

		const documentsById = new Map(
			documents.map((result) => [result.id, result] as const),
		)

		for (const relationId of relationIds) {
			const relatedDoc = documentsById.get(relationId)
			if (relatedDoc) {
				yield new DocumentAccessor(relatedDoc)
				continue
			}
			const info = {
				propertyName,
				relationId,
				documents: documents.map((doc) => doc.id),
				document: this.json,
			}
			Logger.warn(
				`Failed to find related document. ${JSON.stringify(info, null, 2)}`,
			)
		}
	}
}
