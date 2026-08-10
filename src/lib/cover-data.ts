import { z } from "zod";
import { KindType } from "@/types";

// ─── CoverData Discriminated Union Zod Schema ────────────────────────────────

export const repoCoverDataSchema = z.object({
  kind: z.literal("REPO"),
  commits52: z.array(z.number().min(0).max(100)).max(52),
  languages: z.array(z.tuple([z.string(), z.number()])).max(3),
  pushedDaysAgo: z.number().min(0),
});

export const videoCoverDataSchema = z.object({
  kind: z.literal("VIDEO"),
  chapterOffsets: z.array(z.number().min(0).max(1)),
  watchedFraction: z.number().min(0).max(1),
});

export const articleCoverDataSchema = z.object({
  kind: z.literal("ARTICLE"),
  paragraphWidths: z.array(z.number().min(0).max(100)),
  scrollFraction: z.number().min(0).max(1),
});

export const paperCoverDataSchema = z.object({
  kind: z.literal("PAPER"),
  pages: z.number().min(1),
  pagesRead: z.number().min(0),
});

export const playlistCoverDataSchema = z.object({
  kind: z.literal("PLAYLIST"),
  trackCount: z.number().min(0),
  trackLengths: z.array(z.number().min(0).max(100)).max(44),
});

export const docCoverDataSchema = z.object({
  kind: z.literal("DOC"),
  siblings: z.array(z.string()),
  activeIndex: z.number().min(0),
});

export const appCoverDataSchema = z.object({
  kind: z.literal("APP"),
  platforms: z.array(z.string()),
  pricing: z.string().optional(),
  installed: z.boolean(),
});

export const coverDataSchema = z.discriminatedUnion("kind", [
  repoCoverDataSchema,
  videoCoverDataSchema,
  articleCoverDataSchema,
  paperCoverDataSchema,
  playlistCoverDataSchema,
  docCoverDataSchema,
  appCoverDataSchema,
]);

export type CoverData = z.infer<typeof coverDataSchema>;

/**
 * Safe parser for CoverData at render/read boundary.
 * Never throws — returns null on mismatch so component falls back to Hatch.
 */
export function parseCoverData(input: unknown): CoverData | null {
  if (!input || typeof input !== "object") return null;
  const res = coverDataSchema.safeParse(input);
  return res.success ? res.data : null;
}

// ─── REPO & ARTICLE Enrichers ───────────────────────────────────────────────

/**
 * Enrich REPO coverData from GitHub API (or fallback).
 */
export async function enrichRepoCoverData(url: string): Promise<CoverData> {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/i);
  if (!match) {
    return {
      kind: "REPO",
      commits52: Array(52).fill(10),
      languages: [["TypeScript", 100]],
      pushedDaysAgo: 1,
    };
  }

  const owner = match[1];
  const repo = match[2].replace(/\.git$/, "").replace(/#.*$/, "").replace(/\?.*$/, "");

  try {
    const headers = {
      "User-Agent": "HOARD-Bookmark-Manager",
      Accept: "application/vnd.github.v3+json",
    };

    // 1. Fetch repo languages
    const langRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/languages`, {
      headers,
      signal: AbortSignal.timeout(3000),
    }).catch(() => null);

    let languages: [string, number][] = [["Code", 100]];
    if (langRes && langRes.ok) {
      const langMap: Record<string, number> = await langRes.json();
      const totalBytes = Object.values(langMap).reduce((a, b) => a + b, 0) || 1;
      const sorted = Object.entries(langMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      
      languages = sorted.map(([name, bytes]) => [
        name,
        Math.round((bytes / totalBytes) * 100),
      ]);
    }

    // 2. Fetch repo details for pushedDaysAgo
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
      signal: AbortSignal.timeout(3000),
    }).catch(() => null);

    let pushedDaysAgo = 1;
    if (repoRes && repoRes.ok) {
      const repoData = await repoRes.json();
      if (repoData.pushed_at) {
        const pushedDate = new Date(repoData.pushed_at).getTime();
        pushedDaysAgo = Math.max(0, Math.floor((Date.now() - pushedDate) / (1000 * 60 * 60 * 24)));
      }
    }

    // 3. Fetch commit activity (52 weeks)
    let statsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/stats/commit_activity`, {
      headers,
      signal: AbortSignal.timeout(3000),
    }).catch(() => null);

    // GitHub returns 202 while computing stats — retry once after 3s if 202
    if (statsRes && statsRes.status === 202) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      statsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/stats/commit_activity`, {
        headers,
        signal: AbortSignal.timeout(3000),
      }).catch(() => null);
    }

    let commits52: number[] = [];
    if (statsRes && statsRes.ok) {
      const rawStats: { total: number }[] = await statsRes.json();
      if (Array.isArray(rawStats) && rawStats.length > 0) {
        const rawTotals = rawStats.map((w) => w.total || 0);
        const max = Math.max(...rawTotals, 1);
        commits52 = rawTotals.slice(-52).map((t) => Math.min(100, Math.round((t / max) * 100)));
      }
    }

    if (commits52.length === 0) {
      // Generate synthetic 52-week activity curve if API rate-limited
      commits52 = Array.from({ length: 52 }, (_, i) => Math.round(15 + Math.sin(i / 3) * 15 + Math.random() * 20));
    }

    return {
      kind: "REPO",
      commits52,
      languages,
      pushedDaysAgo,
    };
  } catch {
    return {
      kind: "REPO",
      commits52: Array(52).fill(20),
      languages: [["TypeScript", 80], ["Other", 20]],
      pushedDaysAgo: 1,
    };
  }
}

/**
 * Enrich ARTICLE coverData from text content / HTML paragraphs.
 */
export async function enrichArticleCoverData(
  _url: string,
  htmlOrContent?: string
): Promise<CoverData> {
  let paragraphWidths: number[] = [];

  if (htmlOrContent) {
    // Extract paragraphs or line blocks
    const cleanText = htmlOrContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, "\n");

    const paragraphs = cleanText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 20)
      .slice(0, 12);

    if (paragraphs.length >= 3) {
      paragraphWidths = paragraphs.map((p) => Math.min(100, Math.round(p.length / 8)));
    }
  }

  // Fallback if no HTML provided or paragraphs extracted
  if (paragraphWidths.length === 0) {
    paragraphWidths = [88, 94, 76, 62, 92, 85, 70, 96, 80, 64];
  }

  return {
    kind: "ARTICLE",
    paragraphWidths,
    scrollFraction: 0,
  };
}

/**
 * Universal coverData enricher router.
 */
export async function enrichCoverData(
  url: string,
  kind: KindType,
  htmlOrContent?: string
): Promise<CoverData | null> {
  if (kind === "GIT" || url.includes("github.com")) {
    return enrichRepoCoverData(url);
  }
  if (kind === "ART") {
    return enrichArticleCoverData(url, htmlOrContent);
  }
  return null;
}
