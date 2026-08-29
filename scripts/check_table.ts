import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const r = await sql`
    SELECT COUNT(*) as cnt 
    FROM information_schema.tables 
    WHERE table_name = 'financial_investments'
  `;
  console.log("Table exists:", r[0].cnt === "1" ? "YES ✓" : `NO ✗ (count=${r[0].cnt})`);
}

main().catch(console.error);
