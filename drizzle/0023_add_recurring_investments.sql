CREATE TABLE "financial_investments" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "asset_type" varchar(32) NOT NULL DEFAULT 'STOCKS_ETF',
  "amount" real NOT NULL,
  "currency" varchar(8) NOT NULL DEFAULT 'USD',
  "cadence" varchar(16) NOT NULL DEFAULT 'MONTHLY',
  "investment_day" integer DEFAULT 1,
  "platform" text,
  "expected_return_rate" real,
  "current_valuation" real,
  "status" varchar(16) NOT NULL DEFAULT 'ACTIVE',
  "target_asset_id" text,
  "notes" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX "financial_investment_user_status_idx" ON "financial_investments" ("user_id", "status", "updated_at" DESC);
