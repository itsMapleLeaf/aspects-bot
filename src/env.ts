import "dotenv/config.js"

import * as z from "zod"

const result = z
	.object({
		DISCORD_BOT_TOKEN: z.string(),
		NOTION_API_KEY: z.string(),
		NOTION_ASPECTS_DATABASE_ID: z.string(),
		NOTION_RACES_DATABASE_ID: z.string(),
		NOTION_ATTRIBUTES_DATABASE_ID: z.string(),
		NOTION_GENERAL_SKILLS_DATABASE_ID: z.string(),
		NOTION_ASPECT_SKILLS_DATABASE_ID: z.string(),
	})
	.safeParse(process.env)

if (!result.success) {
	const issueLines = result.error.issues.map(
		(issue) => `- ${issue.path.join(".")}: ${issue.message}`,
	)
	throw new Error(`env validation failed:\n${issueLines.join("\n")}`)
}

export const env = result.data
