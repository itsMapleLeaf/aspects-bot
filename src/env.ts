import "https://deno.land/x/dotenv@v3.2.2/load.ts"
import * as z from "npm:zod"

const result = z.object({
	DISCORD_BOT_TOKEN: z.string(),
	NOTION_API_KEY: z.string(),
	NOTION_ASPECTS_DATABASE_ID: z.string(),
	NOTION_RACES_DATABASE_ID: z.string(),
	NOTION_ATTRIBUTES_DATABASE_ID: z.string(),
	NOTION_GENERAL_SKILLS_DATABASE_ID: z.string(),
	NOTION_ASPECT_SKILLS_DATABASE_ID: z.string(),
}).safeParse({
	DISCORD_BOT_TOKEN: Deno.env.get("DISCORD_BOT_TOKEN"),
	NOTION_API_KEY: Deno.env.get("NOTION_API_KEY"),
	NOTION_ASPECTS_DATABASE_ID: Deno.env.get("NOTION_ASPECTS_DATABASE_ID"),
	NOTION_RACES_DATABASE_ID: Deno.env.get("NOTION_RACES_DATABASE_ID"),
	NOTION_ATTRIBUTES_DATABASE_ID: Deno.env.get("NOTION_ATTRIBUTES_DATABASE_ID"),
	NOTION_GENERAL_SKILLS_DATABASE_ID: Deno.env.get(
		"NOTION_GENERAL_SKILLS_DATABASE_ID",
	),
	NOTION_ASPECT_SKILLS_DATABASE_ID: Deno.env.get(
		"NOTION_ASPECT_SKILLS_DATABASE_ID",
	),
})

if (!result.success) {
	const issueLines = result.error.issues.map(
		(issue) => `- ${issue.path.join(".")}: ${issue.message}`,
	)
	throw new Error(`env validation failed:\n${issueLines.join("\n")}`)
}

export const env = result.data
