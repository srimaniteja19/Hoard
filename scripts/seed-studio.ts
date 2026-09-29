/**
 * Loads the OddlyInteresting Studio content (the Prediction Markets series, its
 * pieces with scripts, captions and sources, the other Reels, and saved ideas)
 * into Studio for ONE existing account.
 *
 * Safe to re-run: it skips a series, piece or idea whose title already exists
 * for that user, and never touches any other user's rows.
 *
 * Run: SEED_TARGET_USER_EMAIL=you@example.com npx tsx --env-file=.env.local scripts/seed-studio.ts
 */

import { readFileSync } from "fs";
import path from "path";
import { and, eq } from "drizzle-orm";
import { db } from "../src/db";
import { studioIdeas, studioPieces, studioSeries, users } from "../src/db/schema";
import type { StudioPart, StudioScene, StudioSource } from "../src/db/schema";

type SeedPiece = {
  key: string;
  title: string;
  status: string;
  format: string;
  pillar: string;
  seriesKey?: string | null;
  part?: number | null;
  script: StudioScene[];
  caption: string;
  hashtags: string;
  sources: StudioSource[];
  notes: string;
};
type SeedSeries = {
  key: string;
  title: string;
  theme: string;
  pillar: string;
  nextPart: number;
  parts: { n: number; title: string; summary?: string; pieceKey?: string | null }[];
};
type Seed = { series: SeedSeries[]; pieces: SeedPiece[]; ideas: { title: string; hook: string; pillar: string; format: string }[] };

async function main() {
  const email = process.env.SEED_TARGET_USER_EMAIL;
  if (!email) throw new Error("Set SEED_TARGET_USER_EMAIL to the account that should own the Studio content.");
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (!user) throw new Error(`No user with email ${email}.`);

  const seed = JSON.parse(readFileSync(path.join(__dirname, "data", "studio-seed.json"), "utf8")) as Seed;

  // 1. Series (without piece links yet).
  const seriesIds = new Map<string, string>();
  for (const s of seed.series) {
    const [existing] = await db
      .select({ id: studioSeries.id })
      .from(studioSeries)
      .where(and(eq(studioSeries.userId, user.id), eq(studioSeries.title, s.title)))
      .limit(1);
    if (existing) {
      seriesIds.set(s.key, existing.id);
      console.log(`series exists: ${s.title}`);
      continue;
    }
    const [row] = await db
      .insert(studioSeries)
      .values({ userId: user.id, title: s.title, theme: s.theme, pillar: s.pillar, nextPart: s.nextPart, parts: [] })
      .returning({ id: studioSeries.id });
    seriesIds.set(s.key, row.id);
    console.log(`series added: ${s.title}`);
  }

  // 2. Pieces.
  const pieceIds = new Map<string, string>();
  for (const p of seed.pieces) {
    const [existing] = await db
      .select({ id: studioPieces.id })
      .from(studioPieces)
      .where(and(eq(studioPieces.userId, user.id), eq(studioPieces.title, p.title)))
      .limit(1);
    if (existing) {
      pieceIds.set(p.key, existing.id);
      console.log(`piece exists: ${p.title}`);
      continue;
    }
    const [row] = await db
      .insert(studioPieces)
      .values({
        userId: user.id,
        title: p.title,
        status: p.status,
        format: p.format,
        pillar: p.pillar,
        seriesId: p.seriesKey ? seriesIds.get(p.seriesKey) ?? null : null,
        part: p.part ?? null,
        script: p.script,
        caption: p.caption,
        hashtags: p.hashtags,
        sources: p.sources,
        notes: p.notes,
      })
      .returning({ id: studioPieces.id });
    pieceIds.set(p.key, row.id);
    console.log(`piece added: ${p.title}`);
  }

  // 3. Link series parts to their pieces.
  for (const s of seed.series) {
    const id = seriesIds.get(s.key);
    if (!id) continue;
    const parts: StudioPart[] = s.parts.map((pt) => ({
      n: pt.n,
      title: pt.title,
      summary: pt.summary ?? "",
      pieceId: pt.pieceKey ? pieceIds.get(pt.pieceKey) ?? null : null,
    }));
    await db.update(studioSeries).set({ parts, updatedAt: new Date() }).where(eq(studioSeries.id, id));
  }

  // 4. Ideas.
  for (const i of seed.ideas) {
    const [existing] = await db
      .select({ id: studioIdeas.id })
      .from(studioIdeas)
      .where(and(eq(studioIdeas.userId, user.id), eq(studioIdeas.title, i.title)))
      .limit(1);
    if (existing) continue;
    await db.insert(studioIdeas).values({ userId: user.id, title: i.title, hook: i.hook, pillar: i.pillar, format: i.format });
  }

  console.log("Studio seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
