import { sql } from "drizzle-orm";
import { db } from "@/db";
import { KindType } from "@/types";

export interface SearchResult {
  id: number;
  title: string;
  url: string;
  ty: KindType;
  src: string;
  tag: string;
  useCount: number;
  rank: number;
}

// Ranks by a blend of text-match relevance and useCount (LIBRARY.md §4) — the
// ln damping keeps a single obsessively-reused item from burying good matches
// on a rare-but-relevant search. websearch_to_tsquery (not plainto_tsquery)
// handles natural user-typed strings; the app's existing is:/under:/#tag
// grammar (useBookmarks.ts's parseQ) is untouched — this is a separate path.
export async function searchLibrary(userId: string, query: string, limit = 20): Promise<SearchResult[]> {
  const result = await db.execute(sql`
    SELECT id, title, url, type AS "ty", source AS "src", tag, use_count AS "useCount",
      ts_rank(search_vector, websearch_to_tsquery('english', ${query}))
        * (1 + ln(use_count + 1)) AS rank
    FROM bookmarks
    WHERE user_id = ${userId}
      AND deleted_at IS NULL
      AND search_vector @@ websearch_to_tsquery('english', ${query})
    ORDER BY rank DESC
    LIMIT ${limit}
  `);
  return result.rows as unknown as SearchResult[];
}
