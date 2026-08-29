CREATE TABLE "financial_subscriptions" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "amount" real NOT NULL,
  "currency" varchar(8) NOT NULL DEFAULT 'USD',
  "cadence" varchar(16) NOT NULL DEFAULT 'MONTHLY',
  "category" varchar(32) NOT NULL DEFAULT 'SAAS',
  "billing_day" integer DEFAULT 1,
  "next_renewal_date" varchar(64),
  "status" varchar(16) NOT NULL DEFAULT 'ACTIVE',
  "trial_ends_date" varchar(64),
  "url" text,
  "notes" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX "financial_sub_user_status_idx" ON "financial_subscriptions" ("user_id", "status", "updated_at" DESC);--> statement-breakpoint

CREATE TABLE "financial_debts" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "debt_type" varchar(32) NOT NULL DEFAULT 'CREDIT_CARD',
  "balance" real NOT NULL,
  "original_principal" real,
  "interest_rate" real NOT NULL,
  "min_payment" real NOT NULL,
  "target_payment" real,
  "due_day" integer DEFAULT 1,
  "lender" text,
  "is_paid_off" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX "financial_debt_user_idx" ON "financial_debts" ("user_id", "is_paid_off", "interest_rate" DESC);--> statement-breakpoint

CREATE TABLE "financial_assets" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "category" varchar(32) NOT NULL DEFAULT 'CASH_CHECKING',
  "value" real NOT NULL,
  "institution" text,
  "expected_yield" real,
  "notes" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX "financial_asset_user_idx" ON "financial_assets" ("user_id", "category", "value" DESC);--> statement-breakpoint

CREATE TABLE "financial_incomes" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "amount" real NOT NULL,
  "cadence" varchar(16) NOT NULL DEFAULT 'MONTHLY',
  "category" varchar(32) NOT NULL DEFAULT 'SALARY',
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX "financial_income_user_idx" ON "financial_incomes" ("user_id", "is_active", "updated_at" DESC);--> statement-breakpoint

CREATE TABLE "financial_audits" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "analysis" jsonb NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX "financial_audit_user_idx" ON "financial_audits" ("user_id", "created_at" DESC);
