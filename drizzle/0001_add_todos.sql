CREATE TYPE "public"."todo_energy" AS ENUM('DEEP', 'SHALLOW', 'ERRAND');--> statement-breakpoint
CREATE TYPE "public"."todo_state" AS ENUM('OPEN', 'DONE', 'DROPPED', 'GRAVEYARD');--> statement-breakpoint
CREATE TABLE "todo_subtasks" (
	"id" text PRIMARY KEY NOT NULL,
	"todo_id" text NOT NULL,
	"title" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "todo_tags" (
	"todo_id" text NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "todo_tags_todo_id_tag_id_pk" PRIMARY KEY("todo_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "todos" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"note" text,
	"energy" "todo_energy" DEFAULT 'SHALLOW' NOT NULL,
	"estimated_minutes" integer NOT NULL,
	"actual_minutes" integer,
	"due_date" date,
	"original_due_date" date,
	"rollover_count" integer DEFAULT 0 NOT NULL,
	"remind_at" timestamp with time zone,
	"remind_sent_at" timestamp with time zone,
	"recurrence_rule" varchar(64),
	"recurrence_parent_id" text,
	"series_position" integer,
	"state" "todo_state" DEFAULT 'OPEN' NOT NULL,
	"completed_at" timestamp with time zone,
	"completed_on" date,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "todo_subtasks" ADD CONSTRAINT "todo_subtasks_todo_id_todos_id_fk" FOREIGN KEY ("todo_id") REFERENCES "public"."todos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todo_tags" ADD CONSTRAINT "todo_tags_todo_id_todos_id_fk" FOREIGN KEY ("todo_id") REFERENCES "public"."todos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todo_tags" ADD CONSTRAINT "todo_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_recurrence_parent_id_todos_id_fk" FOREIGN KEY ("recurrence_parent_id") REFERENCES "public"."todos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "todo_subtask_todo_idx" ON "todo_subtasks" USING btree ("todo_id");--> statement-breakpoint
CREATE INDEX "todo_user_due_idx" ON "todos" USING btree ("user_id","due_date");--> statement-breakpoint
CREATE INDEX "todo_user_done_idx" ON "todos" USING btree ("user_id","completed_on");--> statement-breakpoint
CREATE INDEX "todo_reminder_idx" ON "todos" USING btree ("remind_at") WHERE "todos"."remind_sent_at" IS NULL AND "todos"."state" = 'OPEN';--> statement-breakpoint
CREATE INDEX "todo_recurrence_parent_idx" ON "todos" USING btree ("recurrence_parent_id");
