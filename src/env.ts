import { config } from "dotenv"

config({ path: ".env" })
config({ path: ".env.local" })
config({ path: `.env.${process.env.NODE_ENV || "development"}` })
config({ path: `.env.local.${process.env.NODE_ENV || "development"}` })

import * as z from "zod"

const result = z
	.object({
		DISCORD_BOT_TOKEN: z.string(),
	})
	.safeParse(process.env)

if (!result.success) {
	const issueLines = result.error.issues.map(
		(issue) => `- ${issue.path.join(".")}: ${issue.message}`,
	)
	throw new Error(`env validation failed:\n${issueLines.join("\n")}`)
}

export const env = result.data
