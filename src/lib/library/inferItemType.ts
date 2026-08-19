import { KindType } from "@/types";

export type ItemType = "REFERENCE" | "QUEUED";

// LIBRARY.md §1 migration heuristic — also drives new captures (POST /api/bookmarks,
// /api/bookmarks/import). Mirrored by hand in the backfill UPDATE in
// drizzle/0006_add_bookmark_item_type_and_usage.sql — SQL can't import this, keep in sync.
const QUEUED_KINDS: ReadonlySet<KindType> = new Set(["ART", "VID", "PPR"]);

export function inferItemType(kind: KindType): ItemType {
  return QUEUED_KINDS.has(kind) ? "QUEUED" : "REFERENCE";
}
