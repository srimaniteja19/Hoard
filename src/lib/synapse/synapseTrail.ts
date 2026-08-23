import { Bookmark } from "@/types";
import { getBookmarkDate } from "@/lib/library/timeCapsule";

export type SynapseConnectionType =
  | "Conceptual Echo"
  | "Shared Domain"
  | "TIL Synthesis"
  | "Topic Sibling";

export interface SynapseNode {
  id: string;
  ownerType: "bookmark" | "til";
  title: string;
  url: string;
  kind: string;
  tag?: string;
  note?: string;
  similarity: number; // 1 to 100
  connectionType: SynapseConnectionType;
  timeDistance: string;
  angleDeg?: number;
  x?: number;
  y?: number;
}

export interface SynapseTrailGraph {
  targetId: number;
  targetTitle: string;
  nodes: SynapseNode[];
  totalConnections: number;
}

/**
 * Calculates human-readable time distance between two items.
 */
export function computeTimeDistance(dateA: Date, dateB: Date): string {
  const diffMs = Math.abs(dateA.getTime() - dateB.getTime());
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return "Saved on the same day";
  if (diffDays === 1) return "Saved 1 day apart";
  if (diffDays < 7) return `Saved ${diffDays} days apart`;
  if (diffDays < 30) return `Saved ~${Math.round(diffDays / 7)} weeks apart`;
  if (diffDays < 365) return `Saved ~${Math.round(diffDays / 30)} months apart`;
  return `Saved ~${Math.round(diffDays / 365)} years apart`;
}

/**
 * Calculates 2D orbital layout coordinates for satellite synapse nodes around a center (0,0).
 */
export function layoutSynapseNodes(
  nodes: SynapseNode[],
  baseRadius: number = 180
): SynapseNode[] {
  const count = nodes.length;
  if (count === 0) return [];

  const angleStep = (2 * Math.PI) / count;

  return nodes.map((node, idx) => {
    // Stagger radius slightly based on similarity so higher similarity is closer
    const radius = baseRadius * (1 - (node.similarity / 100) * 0.25);
    const angle = idx * angleStep - Math.PI / 2;
    const x = Math.round(Math.cos(angle) * radius);
    const y = Math.round(Math.sin(angle) * radius);
    const angleDeg = Math.round((angle * 180) / Math.PI);

    return {
      ...node,
      angleDeg,
      x,
      y,
    };
  });
}

/**
 * Client-side fallback candidate finder using lexical, tag, domain, and note heuristics.
 */
export function findLocalSynapseCandidates(
  target: Bookmark,
  allBookmarks: Bookmark[]
): SynapseNode[] {
  const targetDate = getBookmarkDate(target);
  const targetTokens = new Set(
    `${target.t} ${target.tag} ${target.note || ""}`
      .toLowerCase()
      .replace(/[^a-z0-9]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2)
  );

  const candidates: SynapseNode[] = [];

  for (const b of allBookmarks) {
    if (b.id === target.id || b.isDeleted || b.parentId) continue;

    const bDate = getBookmarkDate(b);
    const bTokens = new Set(
      `${b.t} ${b.tag} ${b.note || ""}`
        .toLowerCase()
        .replace(/[^a-z0-9]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 2)
    );

    let overlap = 0;
    bTokens.forEach((tok) => {
      if (targetTokens.has(tok)) overlap++;
    });

    const isSameTag = target.tag && b.tag && target.tag.toLowerCase() === b.tag.toLowerCase();
    const isSameDomain = target.src && b.src && target.src.toLowerCase() === b.src.toLowerCase();
    const hasNotes = Boolean(b.note && b.note.trim().length > 10);

    if (overlap >= 1 || isSameTag || isSameDomain) {
      let connectionType: SynapseConnectionType = "Conceptual Echo";
      if (hasNotes && overlap >= 2) {
        connectionType = "TIL Synthesis";
      } else if (isSameTag) {
        connectionType = "Topic Sibling";
      } else if (isSameDomain) {
        connectionType = "Shared Domain";
      }

      const similarity = Math.min(
        98,
        Math.max(45, Math.round(overlap * 18 + (isSameTag ? 25 : 0) + (isSameDomain ? 15 : 0)))
      );

      candidates.push({
        id: String(b.id),
        ownerType: "bookmark",
        title: b.t,
        url: b.url,
        kind: b.ty,
        tag: b.tag,
        note: b.note || undefined,
        similarity,
        connectionType,
        timeDistance: computeTimeDistance(targetDate, bDate),
      });
    }
  }

  // Sort by similarity and return top 6
  return candidates.sort((a, b) => b.similarity - a.similarity).slice(0, 6);
}
