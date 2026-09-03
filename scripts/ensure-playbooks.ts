import { neon } from "@neondatabase/serverless";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing.");
  }

  const sql = neon(databaseUrl);

  await sql`
    CREATE TABLE IF NOT EXISTS playbooks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color VARCHAR(32) NOT NULL DEFAULT 'violet',
      mode VARCHAR(16) NOT NULL DEFAULT 'SEQUENCE',
      steps JSONB NOT NULL DEFAULT '[]'::jsonb,
      default_vars JSONB NOT NULL DEFAULT '{}'::jsonb,
      runs_count INTEGER NOT NULL DEFAULT 0,
      median_duration VARCHAR(32) NOT NULL DEFAULT '30m',
      kept_percent INTEGER NOT NULL DEFAULT 80,
      is_archived BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS playbooks_user_idx ON playbooks(user_id, is_archived);
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS playbook_runs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      playbook_id TEXT REFERENCES playbooks(id) ON DELETE SET NULL,
      run_number VARCHAR(8) NOT NULL,
      title TEXT NOT NULL,
      mode VARCHAR(16) NOT NULL DEFAULT 'SEQUENCE',
      color VARCHAR(32) NOT NULL DEFAULT 'violet',
      vars JSONB NOT NULL DEFAULT '{}'::jsonb,
      steps JSONB NOT NULL DEFAULT '[]'::jsonb,
      state VARCHAR(16) NOT NULL DEFAULT 'LIVE',
      current_step_index INTEGER NOT NULL DEFAULT 0,
      started_at TIMESTAMP NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS playbook_runs_user_idx ON playbook_runs(user_id, state);
  `;

  console.log("Playbooks and Playbook Runs tables successfully created in Neon DB.");
}

main().catch(console.error);
