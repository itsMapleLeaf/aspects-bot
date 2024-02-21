CREATE TABLE `characterAttributeDice` (
	`characterId` text NOT NULL,
	`attributeId` text NOT NULL,
	`die` text NOT NULL,
	PRIMARY KEY(`attributeId`, `characterId`),
	FOREIGN KEY (`characterId`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`attributeId`) REFERENCES `attributes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `characters` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`player` text NOT NULL,
	`raceId` text NOT NULL,
	`aspectId` text NOT NULL,
	`health` integer NOT NULL,
	`maxHealth` integer NOT NULL,
	`fatigue` integer NOT NULL
);
