import { sql } from "drizzle-orm";
import { db } from "@/db";
import { embedText } from "@/lib/embeddings/embedText";

const SNIPPET_LIMIT = 600;

export type VectorOwnerType = "bookmark" | "til";

export interface VectorHit {
  ownerType: VectorOwnerType;
  ownerId: string;
  title: string;
  url: string;
  kind: string;
  snippet: string;
  rank: number;
  shortHash?: string;
}

export interface FetchVectorDeps {
  embedQuery: (query: string) => Promise<number[] | null>;
  searchNeighbors: (userId: string, embedding: number[], limit: number) => Promise<VectorHit[]>;
}

export function citationHref(hit: Pick<VectorHit, "ownerType" | "url" | "shortHash">): string {
  if (hit.ownerType === "til") {
    return hit.shortHash ? `/til?hash=${encodeURIComponent(hit.shortHash)}` : "/til";
  }
  return hit.url;
}

function clipSnippet(value: string | null | undefined): string {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= SNIPPET_LIMIT) return text;
  return `${text.slice(0, SNIPPET_LIMIT).trimEnd()}…`;
}

function asHit(row: Record<string, unknown>): VectorHit {
  const ownerType = row.ownerType === "til" ? "til" : "bookmark";
  const shortHash = typeof row.shortHash === "string" && row.shortHash ? row.shortHash : undefined;
  return {
    ownerType,
    ownerId: String(row.ownerId ?? ""),
    title: String(row.title ?? (ownerType === "til" ? "TIL" : "Untitled")),
    url: String(row.url ?? ""),
    kind: String(row.kind ?? ""),
    snippet: clipSnippet(typeof row.snippet === "string" ? row.snippet : ""),
    rank: Number(row.rank ?? 0),
    ...(shortHash ? { shortHash } : {}),
  };
}

async function defaultSearchNeighbors(
  userId: string,
  embedding: number[],
  limit: number
): Promise<VectorHit[]> {
  const vec = `[${embedding.join(",")}]`;
  try {
    const result = await db.execute(sql`
      SELECT
        e.owner_type AS "ownerType",
        e.owner_id AS "ownerId",
        COALESCE(NULLIF(b.title, ''), LEFT(t.body, 120), 'Untitled') AS title,
        COALESCE(b.url, t.link_url, '') AS url,
        COALESCE(b.type, t.type::text, '') AS kind,
        COALESCE(
          NULLIF(b.note, ''),
          LEFT(b.archived_text, ${SNIPPET_LIMIT}),
          t.body,
          t.code,
          ''
        ) AS snippet,
        t.short_hash AS "shortHash",
        (1 - (e.embedding <=> ${vec}::vector)) AS rank
      FROM embeddings e
      LEFT JOIN bookmarks b
        ON e.owner_type = 'bookmark'
        AND b.id::text = e.owner_id
        AND b.user_id = e.user_id
        AND b.deleted_at IS NULL
      LEFT JOIN til_entries t
        ON e.owner_type = 'til'
        AND t.id = e.owner_id
        AND t.user_id = e.user_id
      WHERE e.user_id = ${userId}
        AND (
          (e.owner_type = 'bookmark' AND b.id IS NOT NULL)
          OR (e.owner_type = 'til' AND t.id IS NOT NULL)
        )
      ORDER BY e.embedding <=> ${vec}::vector
      LIMIT ${limit}
    `);
    return (result.rows as Record<string, unknown>[]).map(asHit);
  } catch (e) {
    console.error("[fetchVector searchNeighbors]", e);
    return [];
  }
}

// Cosine neighbors over the shared embeddings table (bookmarks + TILs).
// Library ⌘K search stays bookmark-only; this is the RAG retrieval the
// ask-your-library tool calls.
export async function fetchVector(
  userId: string,
  query: string,
  limit = 8,
  deps?: Partial<FetchVectorDeps>
): Promise<VectorHit[]> {
  const embedQuery = deps?.embedQuery ?? embedText;
  const searchNeighbors = deps?.searchNeighbors ?? defaultSearchNeighbors;
  const embedding = await embedQuery(query);
  if (!embedding) return [];
  return searchNeighbors(userId, embedding, limit);
}
