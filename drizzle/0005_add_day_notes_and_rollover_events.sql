CREATE TABLE "day_notes" (
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"note" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "day_notes_user_id_date_pk" PRIMARY KEY("user_id","date")
);
--> statement-breakpoint
CREATE TABLE "rollover_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"todo_id" text NOT NULL,
	"occurred_on" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "day_notes" ADD CONSTRAINT "day_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rollover_events" ADD CONSTRAINT "rollover_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rollover_events" ADD CONSTRAINT "rollover_events_todo_id_todos_id_fk" FOREIGN KEY ("todo_id") REFERENCES "public"."todos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rollover_event_user_day_idx" ON "rollover_events" USING btree ("user_id","occurred_on");