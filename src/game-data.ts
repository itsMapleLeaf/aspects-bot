import * as Notion from "npm:@notionhq/client"
import { env } from "./env.ts"

export type Race = {
	id: string
	name: string
	abilities: { name: string; description: string }[]
}

export type Aspect = {
	id: string
	name: string
	description: string
	get attribute(): Attribute
}

export type Attribute = {
	id: string
	name: string
	description: string
	get aspect(): Aspect
}

export type GeneralSkill = {
	id: string
	name: string
	description: string
	difficulty: string
	get attribute(): Attribute
}

export type AspectSkill = {
	id: string
	name: string
	get aspects(): Aspect[]
}

const notion = new Notion.Client({
	auth: env.NOTION_API_KEY,
})

export let races = new Map<string, Race>()
export let aspects = new Map<string, Aspect>()
export let attributes = new Map<string, Attribute>()
export let generalSkills = new Map<string, GeneralSkill>()
export let aspectSkills = new Map<string, AspectSkill>()

function getPropertyText(property: any) {
	if (property.type === "title") {
		return property.title.map((block: any) => block.plain_text ?? "").join("")
	} else if (property.type === "rich_text") {
		return property.rich_text.map((block: any) => block.plain_text ?? "").join(
			"",
		)
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

	races = new Map(racesResponse.results.map((result) => [result.id, {
		id: result.id,
		name: getPropertyText((result as any).properties.Name),
		abilities: getPropertyText((result as any).properties.Abilities)
			.split("\n")
			.map((line: string) => line.split(/\s-\s/g))
			.map(([name, description]: [string, string]) => ({ name, description })),
	}]))

	aspects = new Map(aspectsResponse.results.map((result) => [result.id, {
		id: result.id,
		name: getPropertyText((result as any).properties.Name),
		description: getPropertyText((result as any).properties.Description),
		get attribute() {
			return attributes.get(
				(result as any).properties.Attribute.relation[0].id,
			)!
		},
	}]))

	attributes = new Map(attributesResponse.results.map((result) => [result.id, {
		id: result.id,
		name: getPropertyText((result as any).properties.Name),
		description: getPropertyText((result as any).properties.Description),
		get aspect() {
			return aspects.get(
				(result as any).properties.Aspect.relation[0].id,
			)!
		},
	}]))

	generalSkills = new Map(
		generalSkillsResponse.results.map((result) => [result.id, {
			id: result.id,
			name: getPropertyText((result as any).properties.Name),
			description: getPropertyText((result as any).properties.Description),
			difficulty: getPropertyText((result as any).properties.Difficulty),
			get attribute() {
				return attributes.get(
					(result as any).properties.Attribute.relation[0].id,
				)!
			},
		}]),
	)

	aspectSkills = new Map(
		aspectSkillsResponse.results.map((result) => [result.id, {
			id: result.id,
			name: getPropertyText((result as any).properties.Name),
			get aspects() {
				return (result as any).properties.Aspects.relation.map((r: any) =>
					aspects.get(r.id)!
				)
			},
		}]),
	)
}
