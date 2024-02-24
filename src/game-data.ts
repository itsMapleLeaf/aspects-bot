import * as Notion from "@notionhq/client"
import { eq } from "drizzle-orm"
import { kebabCase } from "lodash-es"
import { db } from "./db.ts"
import { env } from "./env.ts"
import { raise } from "./helpers/errors.ts"
import { Logger } from "./logger.ts"
import * as schema from "./schema.ts"

const notion = new Notion.Client({
	auth: env.NOTION_API_KEY,
})

function getPropertyText(property: any) {
	if (property.type === "title") {
		return property.title.map((block: any) => block.plain_text ?? "").join("")
	} else if (property.type === "rich_text") {
		return property.rich_text
			.map((block: any) => block.plain_text ?? "")
			.join("")
	} else {
		throw new Error(`Unsupported property type: ${property.type}`)
	}
}

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

	for (const result of racesResponse.results) {
		const name = getPropertyText((result as any).properties.Name)

		const abilities = getPropertyText((result as any).properties.Abilities)
			.split("\n")
			.map((line: string) => line.split(/\s-\s/g))
			.map(([name, description]: [string, string]) => ({ name, description }))

		await db
			.insert(schema.racesTable)
			.values({
				id: kebabCase(name),
				name,
				emoji: (result as any).icon?.emoji,
			})
			.onConflictDoUpdate({
				target: [schema.racesTable.id],
				set: { emoji: (result as any).icon?.emoji },
			})

		for (const ability of abilities) {
			await db
				.insert(schema.raceAbilitiesTable)
				.values({
					id: kebabCase(ability.name),
					name: ability.name,
					description: ability.description,
					raceId: kebabCase(name),
				})
				.onConflictDoNothing()
		}
	}

	for (const result of aspectsResponse.results) {
		const name = getPropertyText((result as any).properties.Name)
		const description = getPropertyText((result as any).properties.Description)
		const attributeId = (result as any).properties.Attribute.relation[0].id
		const attributeDoc = attributesResponse.results.find(
			(result) => result.id === attributeId,
		)
		const attributeName = getPropertyText((attributeDoc as any).properties.Name)

		await db
			.insert(schema.aspectsTable)
			.values({
				id: kebabCase(name),
				name,
				description,
				emoji: (result as any).icon?.emoji,
				attributeId: kebabCase(attributeName),
			})
			.onConflictDoUpdate({
				target: [schema.aspectsTable.id],
				set: {
					description,
					emoji: (result as any).icon?.emoji,
					attributeId: kebabCase(attributeName),
				},
			})
	}

	for (const result of attributesResponse.results) {
		const name = getPropertyText((result as any).properties.Name)
		const description = getPropertyText((result as any).properties.Description)
		const aspectId = (result as any).properties.Aspect.relation[0].id
		const aspectDoc = aspectsResponse.results.find(
			(result) => result.id === aspectId,
		)
		const aspectName = getPropertyText((aspectDoc as any).properties.Name)

		await db
			.insert(schema.attributesTable)
			.values({
				id: kebabCase(name),
				name,
				description,
				emoji: (result as any).icon?.emoji,
				aspectId: kebabCase(aspectName),
			})
			.onConflictDoUpdate({
				target: [schema.attributesTable.id],
				set: {
					description,
					emoji: (result as any).icon?.emoji,
					aspectId: kebabCase(aspectName),
				},
			})
	}

	for (const result of generalSkillsResponse.results) {
		const name = getPropertyText((result as any).properties.Name)
		const description = getPropertyText((result as any).properties.Description)
		const difficulty = getPropertyText((result as any).properties.Difficulty)
		const attributeId = (result as any).properties.Attribute.relation[0].id
		const attributeDoc = attributesResponse.results.find(
			(result) => result.id === attributeId,
		)
		const attributeName = getPropertyText((attributeDoc as any).properties.Name)

		await db
			.insert(schema.generalSkillsTable)
			.values({
				id: kebabCase(name),
				name,
				description,
				difficulty,
				attributeId: kebabCase(attributeName),
			})
			.onConflictDoUpdate({
				target: [schema.generalSkillsTable.id],
				set: {
					description,
					difficulty,
					attributeId: kebabCase(attributeName),
				},
			})
	}

	for (const result of aspectSkillsResponse.results) {
		const name = getPropertyText((result as any).properties.Name)

		const aspectIds = (result as any).properties.Aspects.relation.map(
			(relation: any) => {
				const aspectDoc = aspectsResponse.results.find(
					(result) => result.id === relation.id,
				)
				return getPropertyText((aspectDoc as any).properties.Name)
			},
		)

		await db
			.insert(schema.aspectSkillsTable)
			.values({
				id: kebabCase(name),
				name,
			})
			.onConflictDoNothing()

		for (const aspectId of aspectIds) {
			await db
				.insert(schema.aspectSkillsToAspectsTable)
				.values({
					aspectSkillId: kebabCase(name),
					aspectId: kebabCase(aspectId),
				})
				.onConflictDoNothing()
		}
	}
}

export async function listRaces() {
	return await db.query.racesTable.findMany()
}

export async function getRace(id: string) {
	const race = await db.query.racesTable.findFirst({
		where: eq(schema.racesTable.id, id),
	})
	return race ?? raise(`Race not found: ${id}`)
}

export async function listAspects() {
	return await db.query.aspectsTable.findMany()
}

export async function getAspect(id: string) {
	const aspect = await db.query.aspectsTable.findFirst({
		where: eq(schema.aspectsTable.id, id),
	})
	return aspect ?? raise(`Aspect not found: ${id}`)
}

export async function listAttributes() {
	return await db.query.attributesTable.findMany()
}

export async function getAttribute(id: string) {
	const attribute = await db.query.attributesTable.findFirst({
		where: eq(schema.attributesTable.id, id),
	})
	return attribute ?? raise(`Attribute not found: ${id}`)
}

export async function listGeneralSkills() {
	return await db.query.generalSkillsTable.findMany()
}

export async function getGeneralSkill(id: string) {
	const generalSkill = await db.query.generalSkillsTable.findFirst({
		where: eq(schema.generalSkillsTable.id, id),
	})
	return generalSkill ?? raise(`General skill not found: ${id}`)
}

export async function listAspectSkills() {
	return await db.query.aspectSkillsTable.findMany()
}

export async function getAspectSkill(id: string) {
	const aspectSkill = await db.query.aspectSkillsTable.findFirst({
		where: eq(schema.aspectSkillsTable.id, id),
	})
	return aspectSkill ?? raise(`Aspect skill not found: ${id}`)
}

await Logger.async(`Loading game data`, loadGameData)
