import { relations } from "drizzle-orm"
import { int, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const races = sqliteTable("races", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
})

export const racesRelations = relations(races, (helpers) => ({
	abilities: helpers.many(raceAbilities),
}))

export const raceAbilities = sqliteTable("raceAbilities", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	description: text("description").notNull(),
	raceId: text("raceId").notNull(),
})

export const raceAbilitiesRelations = relations(raceAbilities, (helpers) => ({
	race: helpers.one(races),
}))

export const aspects = sqliteTable("aspects", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	description: text("description").notNull(),
	attributeId: text("attributeId").notNull(),
})

export const aspectsRelations = relations(aspects, (helpers) => ({
	attribute: helpers.one(attributes, {
		references: [attributes.id],
		fields: [aspects.attributeId],
	}),
}))

export const attributes = sqliteTable("attributes", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	description: text("description").notNull(),
	aspectId: text("aspectId").notNull(),
})

export const attributesRelations = relations(attributes, (helpers) => ({
	aspect: helpers.one(aspects, {
		references: [aspects.id],
		fields: [attributes.aspectId],
	}),
}))

export const generalSkills = sqliteTable("generalSkills", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	description: text("description").notNull(),
	difficulty: text("difficulty").notNull(),
	attributeId: text("attributeId").notNull(),
})

export const generalSkillsRelations = relations(generalSkills, (helpers) => ({
	attribute: helpers.one(attributes, {
		references: [attributes.id],
		fields: [generalSkills.attributeId],
	}),
}))

export const aspectSkills = sqliteTable("aspectSkills", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
})

export const aspectSkillsToAspects = sqliteTable(
	"aspectSkillsToAspects",
	{
		aspectSkillId: text("aspectSkillId")
			.notNull()
			.references(() => aspectSkills.id),
		aspectId: text("aspectId")
			.notNull()
			.references(() => aspects.id),
	},
	(t) => ({
		pk: primaryKey({ columns: [t.aspectSkillId, t.aspectId] }),
	}),
)

export const aspectSkillsToAspectsRelations = relations(
	aspectSkills,
	(helpers) => ({
		aspect: helpers.one(aspects),
		aspectSkill: helpers.one(aspectSkills),
	}),
)

export const characters = sqliteTable("characters", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	player: text("player"),
	raceId: text("raceId")
		.notNull()
		.references(() => races.id),
	aspectId: text("aspectId")
		.notNull()
		.references(() => aspects.id),
	health: int("health").notNull(),
	maxHealth: int("maxHealth").notNull(),
	fatigue: int("fatigue").notNull(),
})

export const charactersRelations = relations(characters, (helpers) => ({
	race: helpers.one(races, {
		fields: [characters.raceId],
		references: [races.id],
	}),
	aspect: helpers.one(aspects, {
		fields: [characters.aspectId],
		references: [aspects.id],
	}),
}))

export const characterAttributeDice = sqliteTable(
	"characterAttributeDice",
	{
		characterId: text("characterId")
			.notNull()
			.references(() => characters.id),
		attributeId: text("attributeId")
			.notNull()
			.references(() => attributes.id),
		die: text("die").notNull(),
	},
	(t) => ({
		pk: primaryKey({ columns: [t.characterId, t.attributeId] }),
	}),
)
