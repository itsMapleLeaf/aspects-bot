CREATE TABLE `aspectSkillsToAspects` (
	`aspectSkillId` text NOT NULL,
	`aspectId` text NOT NULL,
	FOREIGN KEY (`aspectSkillId`) REFERENCES `aspectSkills`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`aspectId`) REFERENCES `aspects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `aspectSkills` DROP COLUMN `aspectIds`;