CREATE TYPE "public"."certainty" AS ENUM('stated', 'inferred');--> statement-breakpoint
CREATE TYPE "public"."edge_category" AS ENUM('structural', 'event', 'causal', 'paths');--> statement-breakpoint
CREATE TYPE "public"."edge_type" AS ENUM('parent_of', 'sibling_of', 'spouse_of', 'holds', 'member_of', 'leads', 'part_of', 'born_in', 'lives_in', 'based_at', 'controls', 'allied_with', 'at_war_with', 'participated_in', 'occurred_at', 'sub_event_of', 'killed', 'caused', 'experienced', 'received', 'depicts');--> statement-breakpoint
CREATE TYPE "public"."entity_kind" AS ENUM('character', 'titan', 'event', 'location', 'faction', 'arc', 'memory');--> statement-breakpoint
CREATE TABLE "arcs" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"first_chapter" smallint NOT NULL,
	"last_chapter" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"entity_id" text PRIMARY KEY NOT NULL,
	"born" jsonb,
	"died" jsonb,
	"subject_of_ymir" jsonb
);
--> statement-breakpoint
CREATE TABLE "description_segments" (
	"entity_id" text NOT NULL,
	"position" smallint NOT NULL,
	"text" text NOT NULL,
	"revealed_in" smallint NOT NULL,
	"search" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', "text")) STORED,
	CONSTRAINT "description_segments_entity_id_position_pk" PRIMARY KEY("entity_id","position")
);
--> statement-breakpoint
CREATE TABLE "edges" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"target_id" text NOT NULL,
	"type" "edge_type" NOT NULL,
	"category" "edge_category" NOT NULL,
	"revealed_in" smallint NOT NULL,
	"sources" jsonb NOT NULL,
	"certainty" "certainty" NOT NULL,
	"notes" text,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"from_ref" jsonb,
	"until_ref" jsonb,
	"active_start_earliest" integer,
	"active_start_latest" integer,
	"active_end_earliest" integer,
	"active_end_latest" integer,
	"weight" real NOT NULL,
	CONSTRAINT "edges_no_self_loop" CHECK ("edges"."source_id" <> "edges"."target_id")
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" "entity_kind" NOT NULL,
	"revealed_in" smallint NOT NULL,
	"sources" jsonb NOT NULL,
	"notes" text,
	"life_start_earliest" integer,
	"life_start_latest" integer,
	"life_end_earliest" integer,
	"life_end_latest" integer,
	CONSTRAINT "entities_revealed_in_range" CHECK ("entities"."revealed_in" between 1 and 139)
);
--> statement-breakpoint
CREATE TABLE "entity_names" (
	"entity_id" text NOT NULL,
	"position" smallint NOT NULL,
	"name" text NOT NULL,
	"is_primary" boolean NOT NULL,
	"revealed_in" smallint NOT NULL,
	CONSTRAINT "entity_names_entity_id_name_pk" PRIMARY KEY("entity_id","name")
);
--> statement-breakpoint
CREATE TABLE "eras" (
	"key" text PRIMARY KEY NOT NULL,
	"position" smallint NOT NULL,
	"name" text NOT NULL,
	"start_year" integer NOT NULL,
	"end_year" integer NOT NULL,
	"weight" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"entity_id" text PRIMARY KEY NOT NULL,
	"start" jsonb NOT NULL,
	"end" jsonb,
	"seq" smallint
);
--> statement-breakpoint
CREATE TABLE "id_redirects" (
	"old_id" text PRIMARY KEY NOT NULL,
	"new_id" text
);
--> statement-breakpoint
CREATE TABLE "memories" (
	"entity_id" text PRIMARY KEY NOT NULL,
	"start" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "volumes" (
	"volume" smallint PRIMARY KEY NOT NULL,
	"first_chapter" smallint NOT NULL,
	"last_chapter" smallint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "characters" ADD CONSTRAINT "characters_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "description_segments" ADD CONSTRAINT "description_segments_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_source_id_entities_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_target_id_entities_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entity_names" ADD CONSTRAINT "entity_names_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "id_redirects" ADD CONSTRAINT "id_redirects_new_id_entities_id_fk" FOREIGN KEY ("new_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "description_segments_search_idx" ON "description_segments" USING gin ("search");--> statement-breakpoint
CREATE INDEX "edges_source_idx" ON "edges" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "edges_target_idx" ON "edges" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "edges_revealed_in_idx" ON "edges" USING btree ("revealed_in");--> statement-breakpoint
CREATE INDEX "entities_kind_idx" ON "entities" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "entities_revealed_in_idx" ON "entities" USING btree ("revealed_in");--> statement-breakpoint
CREATE INDEX "entity_names_trgm_idx" ON "entity_names" USING gin (lower("name") gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "eras_position_idx" ON "eras" USING btree ("position");--> statement-breakpoint
CREATE INDEX "events_seq_idx" ON "events" USING btree ("seq");