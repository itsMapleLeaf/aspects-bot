import { relations } from "drizzle-orm"
import { int, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const racesTable = sqliteTable("races", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
})

export const racesRelations = relations(racesTable, (helpers) => ({
	abilities: helpers.many(raceAbilitiesTable),
}))

export const raceAbilitiesTable = sqliteTable("raceAbilities", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	description: text("description").notNull(),
	raceId: text("raceId").notNull(),
})

export const raceAbilitiesRelations = relations(
	raceAbilitiesTable,
	(helpers) => ({
		race: helpers.one(racesTable),
	}),
)

export const aspectsTable = sqliteTable("aspects", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	description: text("description").notNull(),
	attributeId: text("attributeId").notNull(),
})

export const aspectsRelations = relations(aspectsTable, (helpers) => ({
	attribute: helpers.one(attributesTable, {
		references: [attributesTable.id],
		fields: [aspectsTable.attributeId],
	}),
}))

export const attributesTable = sqliteTable("attributes", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	description: text("description").notNull(),
	aspectId: text("aspectId").notNull(),
})

export const attributesRelations = relations(attributesTable, (helpers) => ({
	aspect: helpers.one(aspectsTable, {
		references: [aspectsTable.id],
		fields: [attributesTable.aspectId],
	}),
}))

export const generalSkillsTable = sqliteTable("generalSkills", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	description: text("description").notNull(),
	difficulty: text("difficulty").notNull(),
	attributeId: text("attributeId").notNull(),
})

export const generalSkillsRelations = relations(
	generalSkillsTable,
	(helpers) => ({
		attribute: helpers.one(attributesTable, {
			references: [attributesTable.id],
			fields: [generalSkillsTable.attributeId],
		}),
	}),
)

export const aspectSkillsTable = sqliteTable("aspectSkills", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
})

export const aspectSkillsToAspectsTable = sqliteTable(
	"aspectSkillsToAspects",
	{
		aspectSkillId: text("aspectSkillId")
			.notNull()
			.references(() => aspectSkillsTable.id),
		aspectId: text("aspectId")
			.notNull()
			.references(() => aspectsTable.id),
	},
	(t) => ({
		pk: primaryKey({ columns: [t.aspectSkillId, t.aspectId] }),
	}),
)

export const aspectSkillsToAspectsRelations = relations(
	aspectSkillsTable,
	(helpers) => ({
		aspect: helpers.one(aspectsTable),
		aspectSkill: helpers.one(aspectSkillsTable),
	}),
)

export const charactersTable = sqliteTable("characters", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	playerDiscordId: text("playerDiscordId").unique(),
	raceId: text("raceId")
		.notNull()
		.references(() => racesTable.id),
	aspectId: text("aspectId")
		.notNull()
		.references(() => aspectsTable.id),
	secondaryAttributeId: text("secondaryAttributeId")
		.references(() => attributesTable.id)
		.notNull(),
	health: int("health").notNull(),
	fatigue: int("fatigue").notNull(),
	currency: int("currency").notNull().default(100),
})

export const charactersRelations = relations(charactersTable, (helpers) => ({
	race: helpers.one(racesTable, {
		fields: [charactersTable.raceId],
		references: [racesTable.id],
	}),
	aspect: helpers.one(aspectsTable, {
		fields: [charactersTable.aspectId],
		references: [aspectsTable.id],
	}),
	secondaryAttribute: helpers.one(attributesTable, {
		fields: [charactersTable.secondaryAttributeId],
		references: [attributesTable.id],
	}),
}))
