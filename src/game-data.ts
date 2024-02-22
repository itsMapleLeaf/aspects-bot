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

	for (const doc of racesResponse.results) {
		const name = getPropertyText((doc as any).properties.Name)

		const abilities = getPropertyText((doc as any).properties.Abilities)
			.split("\n")
			.map((line: string) => line.split(/\s-\s/g))
			.map(([name, description]: [string, string]) => ({ name, description }))

		await db
			.insert(schema.races)
			.values({
				id: kebabCase(name),
				name,
			})
			.onConflictDoNothing()

		for (const ability of abilities) {
			await db
				.insert(schema.raceAbilities)
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
			.insert(schema.aspects)
			.values({
				id: kebabCase(name),
				name,
				description,
				attributeId: kebabCase(attributeName),
			})
			.onConflictDoNothing()
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
			.insert(schema.attributes)
			.values({
				id: kebabCase(name),
				name,
				description,
				aspectId: kebabCase(aspectName),
			})
			.onConflictDoNothing()
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
			.insert(schema.generalSkills)
			.values({
				id: kebabCase(name),
				name,
				description,
				difficulty,
				attributeId: kebabCase(attributeName),
			})
			.onConflictDoNothing()
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
			.insert(schema.aspectSkills)
			.values({
				id: kebabCase(name),
				name,
			})
			.onConflictDoNothing()

		for (const aspectId of aspectIds) {
			await db
				.insert(schema.aspectSkillsToAspects)
				.values({
					aspectSkillId: kebabCase(name),
					aspectId: kebabCase(aspectId),
				})
				.onConflictDoNothing()
		}
	}
}

export async function listRaces() {
	return await db.query.races.findMany()
}

export async function getRace(id: string) {
	const race = await db.query.races.findFirst({
		where: eq(schema.races.id, id),
	})
	return race ?? raise(`Race not found: ${id}`)
}

export async function listAspects() {
	return await db.query.aspects.findMany()
}

export async function getAspect(id: string) {
	const aspect = await db.query.aspects.findFirst({
		where: eq(schema.aspects.id, id),
	})
	return aspect ?? raise(`Aspect not found: ${id}`)
}

export async function listAttributes() {
	return await db.query.attributes.findMany()
}

export async function getAttribute(id: string) {
	const attribute = await db.query.attributes.findFirst({
		where: eq(schema.attributes.id, id),
	})
	return attribute ?? raise(`Attribute not found: ${id}`)
}

export async function listGeneralSkills() {
	return await db.query.generalSkills.findMany()
}

export async function getGeneralSkill(id: string) {
	const generalSkill = await db.query.generalSkills.findFirst({
		where: eq(schema.generalSkills.id, id),
	})
	return generalSkill ?? raise(`General skill not found: ${id}`)
}

export async function listAspectSkills() {
	return await db.query.aspectSkills.findMany()
}

export async function getAspectSkill(id: string) {
	const aspectSkill = await db.query.aspectSkills.findFirst({
		where: eq(schema.aspectSkills.id, id),
	})
	return aspectSkill ?? raise(`Aspect skill not found: ${id}`)
}

await Logger.async(`Loading game data`, loadGameData)
