import { Bookmark, KindType } from "@/types";

export type KnowledgeDensityLevel = "Deep Dive" | "High Density" | "Growing" | "Emerging";

export interface LivingTopicCluster {
  id: string;
  title: string;
  description?: string;
  color: string;
  icon: string;
  bookmarks: Bookmark[];
  totalCount: number;
  unreadCount: number;
  readCount: number;
  exploredRatio: number;
  exploredPercentage: number;
  densityLevel: KnowledgeDensityLevel;
  densityScore: number;
  dominantKinds: KindType[];
  topTags: string[];
  lastActiveAt?: string;
}

interface TopicSignature {
  name: string;
  icon: string;
  color: string;
  keywords: string[];
}

const KNOWN_TOPICS: TopicSignature[] = [
  {
    name: "Artificial Intelligence & LLMs",
    icon: "⚡",
    color: "#FFE600",
    keywords: ["ai", "llm", "gpt", "rag", "embeddings", "agent", "agents", "ml", "transformer", "neural"],
  },
  {
    name: "Databases & Storage Engines",
    icon: "⚙️",
    color: "#00E58A",
    keywords: ["db", "database", "postgres", "sql", "storage", "sqlite", "wal", "btree", "hnsw", "vector"],
  },
  {
    name: "Frontend & Design Systems",
    icon: "🎨",
    color: "#00F0FF",
    keywords: ["design", "ui", "ux", "css", "frontend", "react", "nextjs", "tailwind", "typography", "web"],
  },
  {
    name: "Systems & Infrastructure",
    icon: "📦",
    color: "#B6FF3C",
    keywords: ["systems", "infra", "rust", "distributed", "linux", "kernel", "networking", "cloud", "docker", "k8s"],
  },
  {
    name: "Product & Engineering Craft",
    icon: "🚀",
    color: "#FF6B00",
    keywords: ["craft", "product", "startup", "architecture", "strategy", "management", "workflow", "productivity"],
  },
  {
    name: "Media, Audio & Watch Queue",
    icon: "🎧",
    color: "#7C4DFF",
    keywords: ["listen", "podcast", "audio", "video", "youtube", "music", "watch", "talk"],
  },
];

/**
 * Normalizes string for topic keyword matching.
 */
function cleanText(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, " ").trim();
}

/**
 * Determines which topic signature a bookmark matches best.
 */
function matchTopicSignature(b: Bookmark): TopicSignature | null {
  const hay = `${cleanText(b.tag)} ${cleanText(b.t)} ${cleanText(b.note || "")} ${cleanText(b.src)}`;
  const tokens = new Set(hay.split(/\s+/).filter(Boolean));

  for (const topic of KNOWN_TOPICS) {
    for (const kw of topic.keywords) {
      if (tokens.has(kw) || b.tag.toLowerCase() === kw) {
        return topic;
      }
    }
  }
  return null;
}

/**
 * Calculates Knowledge Density score (1–100) and human-readable level.
 */
export function calculateKnowledgeDensity(
  bookmarks: Bookmark[]
): { score: number; level: KnowledgeDensityLevel } {
  const total = bookmarks.length;
  const withNotes = bookmarks.filter((b) => Boolean(b.note && b.note.trim().length > 10)).length;
  const totalUses = bookmarks.reduce((sum, b) => sum + (b.useCount || 0), 0);
  const readCount = bookmarks.filter((b) => !b.unread).length;

  const score = Math.min(
    100,
    Math.round(total * 10 + withNotes * 8 + readCount * 6 + Math.min(20, totalUses * 2))
  );

  let level: KnowledgeDensityLevel = "Emerging";
  if (score >= 65 || total >= 8) {
    level = "Deep Dive";
  } else if (score >= 40 || total >= 4) {
    level = "High Density";
  } else if (score >= 20 || total >= 2) {
    level = "Growing";
  }

  return { score, level };
}

/**
 * Builds living self-organizing topic clusters from all bookmarks.
 */
export function buildLivingTopicClusters(bookmarks: Bookmark[]): LivingTopicCluster[] {
  const active = bookmarks.filter((b) => !b.isDeleted && !b.parentId);
  const clusterMap = new Map<string, { title: string; icon: string; color: string; items: Bookmark[] }>();

  // 1. Group by explicit clusterTitle or smart topic signatures or clean tags
  active.forEach((b) => {
    let key: string;
    let title: string;
    let icon = "🏷️";
    let color = "#00F0FF";

    if (b.clusterTitle && b.clusterTitle.trim()) {
      title = b.clusterTitle.trim();
      key = `explicit-${title.toLowerCase()}`;
      icon = "⚡";
      color = "#FFE600";
    } else {
      const matched = matchTopicSignature(b);
      if (matched) {
        key = `topic-${matched.name.toLowerCase()}`;
        title = matched.name;
        icon = matched.icon;
        color = matched.color;
      } else {
        const rawTag = b.tag ? b.tag.trim().toLowerCase() : "general";
        key = `tag-${rawTag}`;
        title = rawTag.charAt(0).toUpperCase() + rawTag.slice(1);
        icon = "🏷️";
        color = "#B6FF3C";
      }
    }

    if (!clusterMap.has(key)) {
      clusterMap.set(key, { title, icon, color, items: [] });
    }
    clusterMap.get(key)!.items.push(b);
  });

  // 2. Build rich LivingTopicCluster objects
  const clusters: LivingTopicCluster[] = [];

  clusterMap.forEach((val, key) => {
    const items = val.items;
    if (items.length === 0) return;

    const totalCount = items.length;
    const unreadCount = items.filter((b) => b.unread).length;
    const readCount = totalCount - unreadCount;
    const exploredRatio = totalCount > 0 ? readCount / totalCount : 0;
    const exploredPercentage = Math.round(exploredRatio * 100);

    const { score: densityScore, level: densityLevel } = calculateKnowledgeDensity(items);

    // Dominant kinds
    const kindCounts = new Map<KindType, number>();
    items.forEach((b) => kindCounts.set(b.ty, (kindCounts.get(b.ty) || 0) + 1));
    const dominantKinds = Array.from(kindCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k);

    // Top tags
    const tagCounts = new Map<string, number>();
    items.forEach((b) => {
      if (b.tag) tagCounts.set(b.tag, (tagCounts.get(b.tag) || 0) + 1);
    });
    const topTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([t]) => t);

    // Most recent activity
    const latestCreated = items.reduce<string | undefined>((latest, b) => {
      if (!b.createdAt) return latest;
      if (!latest) return b.createdAt;
      return new Date(b.createdAt) > new Date(latest) ? b.createdAt : latest;
    }, undefined);

    clusters.push({
      id: key,
      title: val.title,
      color: val.color,
      icon: val.icon,
      bookmarks: items,
      totalCount,
      unreadCount,
      readCount,
      exploredRatio,
      exploredPercentage,
      densityLevel,
      densityScore,
      dominantKinds,
      topTags,
      lastActiveAt: latestCreated,
    });
  });

  // Sort by densityScore and totalCount
  return clusters.sort((a, b) => {
    if (b.densityScore !== a.densityScore) return b.densityScore - a.densityScore;
    return b.totalCount - a.totalCount;
  });
}
