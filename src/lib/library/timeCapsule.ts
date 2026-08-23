import { Bookmark } from "@/types";

export type TimeHorizon = "all" | "yesterday" | "lastWeek" | "lastMonth" | "earlier";

export interface TimeCapsuleNudge {
  id: number;
  bookmark: Bookmark;
  horizon: Exclude<TimeHorizon, "all">;
  headline: string;
  badge: string;
  color: string;
  accent: string;
  icon: string;
  prompt: string;
  daysAgo: number;
  timeLabel: string;
}

export interface HorizonSummary {
  horizon: TimeHorizon;
  label: string;
  icon: string;
  count: number;
}

/**
 * Parses bookmark creation date safely.
 */
export function getBookmarkDate(b: Bookmark): Date {
  if (b.createdAt) {
    const d = new Date(b.createdAt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (b.when) {
    // Check if format is "Aug 22" or "Aug 22, 2026"
    const hasYear = /\d{4}/.test(b.when);
    const dateStr = hasYear ? b.when : `${b.when} ${new Date().getFullYear()}`;
    const d = new Date(dateStr);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (b.updatedAt) {
    const d = new Date(b.updatedAt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

/**
 * Computes difference in calendar days (or fractional 24h days) between two dates.
 */
export function getDaysAgo(date: Date, now: Date = new Date()): number {
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Classifies a single bookmark into a time horizon based on age in days.
 */
export function classifyHorizon(daysAgo: number): Exclude<TimeHorizon, "all"> | null {
  if (daysAgo <= 0) {
    // Added today — not yet a memory nudge
    return null;
  }
  if (daysAgo >= 1 && daysAgo <= 2) {
    return "yesterday";
  }
  if (daysAgo >= 5 && daysAgo <= 10) {
    return "lastWeek";
  }
  if (daysAgo >= 21 && daysAgo <= 40) {
    return "lastMonth";
  }
  if (daysAgo > 40) {
    return "earlier";
  }
  return null;
}

/**
 * Generates engaging, context-aware nudge copy based on horizon and bookmark type.
 */
export function getHorizonMetadata(horizon: Exclude<TimeHorizon, "all">, daysAgo: number): {
  headline: string;
  badge: string;
  color: string;
  accent: string;
  icon: string;
  prompt: string;
  timeLabel: string;
} {
  switch (horizon) {
    case "yesterday":
      return {
        headline: "ADDED YESTERDAY",
        badge: "YESTERDAY",
        color: "#FF007A",
        accent: "#FFFFFF",
        icon: "📌",
        prompt: "Captured yesterday while fresh in mind — ready to dive in?",
        timeLabel: daysAgo === 1 ? "1 day ago" : `${daysAgo} days ago`,
      };
    case "lastWeek":
      return {
        headline: "HOARDED LAST WEEK",
        badge: "LAST WEEK",
        color: "#7C4DFF",
        accent: "#FFFFFF",
        icon: "📌",
        prompt: "You saved this last week — still relevant to what you're working on?",
        timeLabel: `${daysAgo} days ago`,
      };
    case "lastMonth":
      return {
        headline: "SAVED A MONTH AGO",
        badge: "LAST MONTH",
        color: "#C026D3",
        accent: "#FFFFFF",
        icon: "📌",
        prompt: "One month in your backlog — open it, review it, or discharge to TIL?",
        timeLabel: `~${Math.round(daysAgo / 7)} weeks ago`,
      };
    case "earlier":
      return {
        headline: "DEEP FROM THE VAULT",
        badge: "ARCHIVE ECHO",
        color: "#4C1D95",
        accent: "#FFFFFF",
        icon: "📌",
        prompt: "A gem from your past collections resurfacing today.",
        timeLabel: `${Math.round(daysAgo / 30)} mo ago`,
      };
  }
}

/**
 * Builds candidate memory nudges from active unread / reference bookmarks.
 */
export function buildTimeCapsuleNudges(
  bookmarks: Bookmark[],
  dismissedIds: Set<number> = new Set(),
  now: Date = new Date()
): TimeCapsuleNudge[] {
  const nudges: TimeCapsuleNudge[] = [];

  bookmarks.forEach((b) => {
    if (b.isDeleted || !b.unread || dismissedIds.has(b.id) || b.parentId) {
      return;
    }

    const date = getBookmarkDate(b);
    const daysAgo = getDaysAgo(date, now);
    const horizon = classifyHorizon(daysAgo);

    if (horizon) {
      const meta = getHorizonMetadata(horizon, daysAgo);
      nudges.push({
        id: b.id,
        bookmark: b,
        horizon,
        daysAgo,
        ...meta,
      });
    }
  });

  // Sort by priority: yesterday first, then last week, then last month
  const horizonWeight: Record<Exclude<TimeHorizon, "all">, number> = {
    yesterday: 1,
    lastWeek: 2,
    lastMonth: 3,
    earlier: 4,
  };

  return nudges.sort((a, b) => {
    if (horizonWeight[a.horizon] !== horizonWeight[b.horizon]) {
      return horizonWeight[a.horizon] - horizonWeight[b.horizon];
    }
    return b.daysAgo - a.daysAgo;
  });
}

/**
 * Summarizes counts for all available time horizons.
 */
export function getHorizonSummaries(nudges: TimeCapsuleNudge[]): HorizonSummary[] {
  const yesterdayCount = nudges.filter((n) => n.horizon === "yesterday").length;
  const lastWeekCount = nudges.filter((n) => n.horizon === "lastWeek").length;
  const lastMonthCount = nudges.filter((n) => n.horizon === "lastMonth").length;
  const earlierCount = nudges.filter((n) => n.horizon === "earlier").length;

  return [
    { horizon: "all", label: "ALL NUDGES", icon: "✨", count: nudges.length },
    { horizon: "yesterday", label: "YESTERDAY", icon: "🔥", count: yesterdayCount },
    { horizon: "lastWeek", label: "LAST WEEK", icon: "⚡", count: lastWeekCount },
    { horizon: "lastMonth", label: "LAST MONTH", icon: "⏳", count: lastMonthCount },
    ...(earlierCount > 0
      ? [{ horizon: "earlier" as TimeHorizon, label: "DEEP VAULT", icon: "🏛️", count: earlierCount }]
      : []),
  ];
}
