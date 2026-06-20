CREATE TABLE `readings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`question` text,
	`spread` text NOT NULL,
	`cards` text NOT NULL,
	`interpretation` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text,
	`gender` text,
	`age` integer,
	`phone` text,
	`comment` text,
	`email_confirmed` integer DEFAULT false NOT NULL,
	`confirmation_token` text,
	`reset_token` text,
	`reset_token_expires` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_confirmation_token_unique` ON `users` (`confirmation_token`);