CREATE TABLE `aspectSkills` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`aspectIds` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `aspects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`attributeId` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `attributes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`aspectId` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `generalSkills` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`difficulty` text NOT NULL,
	`attributeId` text NOT NULL
);
