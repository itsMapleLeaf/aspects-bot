import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import * as schema from "./schema.ts"

const sqlite = new Database("data.sqlite")

export const db = drizzle(sqlite, { schema })

migrate(db, { migrationsFolder: "migrations" })
