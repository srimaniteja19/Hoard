import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_s0I7RgTOcUCj@ep-lingering-smoke-audr3wu7-pooler.c-10.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";

const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema });
