/*
 SQLite does not support "Drop not null from column" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html
                  https://stackoverflow.com/questions/2083543/modify-a-columns-type-in-sqlite3

 Due to that we don't generate migration automatically and it has to be done manually
*/
ALTER TABLE `characters` RENAME TO `old_characters`;
--> statement-breakpoint
CREATE TABLE `characters` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`player` text,
	`raceId` text NOT NULL,
	`aspectId` text NOT NULL,
	`health` integer NOT NULL,
	`maxHealth` integer NOT NULL,
	`fatigue` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `characters` SELECT * FROM `old_characters`;
--> statement-breakpoint
DROP TABLE `old_characters`;
