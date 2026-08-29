ALTER TABLE "financial_incomes" ADD COLUMN IF NOT EXISTS "is_pre_tax" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "financial_incomes" ADD COLUMN IF NOT EXISTS "country" varchar(8) DEFAULT 'US';--> statement-breakpoint
ALTER TABLE "financial_incomes" ADD COLUMN IF NOT EXISTS "region" varchar(16);--> statement-breakpoint
ALTER TABLE "financial_incomes" ADD COLUMN IF NOT EXISTS "custom_tax_rate" real;
