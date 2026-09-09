ALTER TABLE "reader_senders" ADD COLUMN IF NOT EXISTS "email" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reader_sender_email_idx" ON "reader_senders" ("email");--> statement-breakpoint

ALTER TABLE "reader_issues" ADD COLUMN IF NOT EXISTS "message_id" text;--> statement-breakpoint
ALTER TABLE "reader_issues" ADD COLUMN IF NOT EXISTS "closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reader_issues" ADD COLUMN IF NOT EXISTS "density" varchar(16);--> statement-breakpoint
ALTER TABLE "reader_issues" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "reader_issues" ADD CONSTRAINT "reader_issues_message_id_unique" UNIQUE ("message_id");
EXCEPTION
  WHEN duplicate_table THEN null;
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "reader_issues_message_id_idx" ON "reader_issues" ("message_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reader_issues_deleted_at_idx" ON "reader_issues" ("deleted_at");--> statement-breakpoint

ALTER TABLE "reader_keeps" ALTER COLUMN "issue_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reader_keeps" ADD COLUMN IF NOT EXISTS "source_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "reader_keeps" ADD COLUMN IF NOT EXISTS "source_url" text;--> statement-breakpoint

ALTER TABLE "reader_keeps" DROP CONSTRAINT IF EXISTS "reader_keeps_issue_id_reader_issues_id_fk";--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "reader_keeps" ADD CONSTRAINT "reader_keeps_issue_id_reader_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "reader_issues"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_table THEN null;
  WHEN duplicate_object THEN null;
END $$;
