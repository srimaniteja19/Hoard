CREATE TABLE "financial_daily_expenses" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "amount" real NOT NULL,
  "currency" varchar(8) NOT NULL DEFAULT 'USD',
  "note" text NOT NULL,
  "category" varchar(32) NOT NULL DEFAULT 'misc',
  "date" varchar(10) NOT NULL,
  "time" varchar(8) NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX "financial_daily_expense_user_date_idx" ON "financial_daily_expenses" ("user_id", "date", "created_at" DESC);
