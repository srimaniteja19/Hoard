import { sql } from "drizzle-orm";
import { db } from "@/db";
import { KindType } from "@/types";
import { fuseSearchLists } from "@/lib/embeddings/fuseSearchLists";
import { embedText } from "@/lib/embeddings/embedText";

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

export interface SearchLibraryDeps {
  fetchFts: (userId: string, query: string, limit: number) => Promise<SearchResult[]>;
  embedQuery: (query: string) => Promise<number[] | null>;
  fetchVector: (userId: string, embedding: number[], limit: number) => Promise<SearchResult[]>;
}

const CANDIDATE_LIMIT = 50;

async function defaultFetchFts(userId: string, query: string, limit: number): Promise<SearchResult[]> {
  const result = await db.execute(sql`
    SELECT id, title, url, type AS "ty", source AS "src", tag, use_count AS "useCount",
      ts_rank(search_vector, websearch_to_tsquery('english', ${query})) AS rank
    FROM bookmarks
    WHERE user_id = ${userId}
      AND deleted_at IS NULL
      AND search_vector @@ websearch_to_tsquery('english', ${query})
    ORDER BY rank DESC
    LIMIT ${limit}
  `);
  return result.rows as unknown as SearchResult[];
}

async function defaultFetchVector(
  userId: string,
  embedding: number[],
  limit: number
): Promise<SearchResult[]> {
  const vec = `[${embedding.join(",")}]`;
  try {
    const result = await db.execute(sql`
      SELECT b.id, b.title, b.url, b.type AS "ty", b.source AS "src", b.tag, b.use_count AS "useCount",
        (1 - (e.embedding <=> ${vec}::vector)) AS rank
      FROM embeddings e
      JOIN bookmarks b ON b.user_id = e.user_id AND b.id::text = e.owner_id
      WHERE e.user_id = ${userId}
        AND e.owner_type = 'bookmark'
        AND b.deleted_at IS NULL
      ORDER BY e.embedding <=> ${vec}::vector
      LIMIT ${limit}
    `);
    return result.rows as unknown as SearchResult[];
  } catch (e) {
    console.error("[searchLibrary fetchVector]", e);
    return [];
  }
}

// Ranks by Reciprocal Rank Fusion of keyword FTS and cosine neighbors, then
// the existing ln(useCount+1) damping (LIBRARY.md §4). Vector retrieval is
// skipped when the query embed fails so ⌘K still works FTS-only.
export async function searchLibrary(
  userId: string,
  query: string,
  limit = 20,
  deps?: Partial<SearchLibraryDeps>
): Promise<SearchResult[]> {
  const fetchFts = deps?.fetchFts ?? defaultFetchFts;
  const embedQuery = deps?.embedQuery ?? embedText;
  const fetchVector = deps?.fetchVector ?? defaultFetchVector;

  const candidateLimit = Math.max(limit, CANDIDATE_LIMIT);
  const [fts, embedding] = await Promise.all([
    fetchFts(userId, query, candidateLimit),
    embedQuery(query),
  ]);
  const vector = embedding ? await fetchVector(userId, embedding, candidateLimit) : [];
  return fuseSearchLists(fts, vector).slice(0, limit);
}
