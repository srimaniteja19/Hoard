CREATE TABLE "financial_debt_payments" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "debt_id" text NOT NULL REFERENCES "financial_debts"("id") ON DELETE CASCADE,
  "debt_name" text NOT NULL,
  "amount" real NOT NULL,
  "interest_portion" real NOT NULL DEFAULT 0,
  "principal_portion" real NOT NULL DEFAULT 0,
  "remaining_balance" real NOT NULL DEFAULT 0,
  "label" text,
  "payment_date" timestamp NOT NULL DEFAULT now(),
  "created_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX "financial_debt_payments_user_date_idx" ON "financial_debt_payments" ("user_id", "payment_date" DESC);--> statement-breakpoint
CREATE INDEX "financial_debt_payments_user_debt_idx" ON "financial_debt_payments" ("user_id", "debt_id", "payment_date" DESC);
