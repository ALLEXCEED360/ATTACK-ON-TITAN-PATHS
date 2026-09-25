ALTER TABLE "edges" ADD COLUMN "own_start_earliest" integer;--> statement-breakpoint
ALTER TABLE "edges" ADD COLUMN "own_start_latest" integer;--> statement-breakpoint
ALTER TABLE "edges" ADD COLUMN "own_end_earliest" integer;--> statement-breakpoint
ALTER TABLE "edges" ADD COLUMN "own_end_latest" integer;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "life_start_revealed_in" smallint;--> statement-breakpoint
ALTER TABLE "entities" ADD COLUMN "life_end_revealed_in" smallint;