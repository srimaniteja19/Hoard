import { Bookmark, KindType } from "@/types";
import { getBookmarkDate } from "@/lib/library/timeCapsule";

export interface GazetteLedger {
  totalCaptured: number;
  readCount: number;
  minutesInvested: number;
  topTopic: string;
  dominantKind: KindType;
  tilNotesMinted: number;
}

export interface HoardGazetteIssue {
  issueNumber: number;
  volumeNumber: number;
  dateRange: string;
  publishedDate: string;
  leadStory: Bookmark | null;
  editorialHighlights: Bookmark[];
  vaultResurfaced: Bookmark[];
  ledger: GazetteLedger;
  topicBreakdown: Array<{ name: string; count: number; percentage: number }>;
}

/**
 * Calculates ISO week number and year.
 */
function getWeekNumber(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { week: weekNo, year: d.getUTCFullYear() };
}

/**
 * Formats date range for the current week issue (e.g. "Aug 17 – Aug 23, 2026").
 */
function formatWeekDateRange(now: Date): string {
  const end = new Date(now);
  const start = new Date(now);
  start.setDate(start.getDate() - 6);

  const startMonth = start.toLocaleDateString("en-US", { month: "short" });
  const endMonth = end.toLocaleDateString("en-US", { month: "short" });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = end.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} – ${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
}

/**
 * Generates an automated Hoard Gazette Issue from the user's bookmarks.
 */
export function generateWeeklyGazette(
  bookmarks: Bookmark[],
  targetDate: Date = new Date()
): HoardGazetteIssue {
  const { week, year } = getWeekNumber(targetDate);
  const volumeNumber = Math.max(1, year - 2023);
  const issueNumber = week;
  const publishedDate = targetDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const dateRange = formatWeekDateRange(targetDate);

  const active = bookmarks.filter((b) => !b.isDeleted && !b.parentId);
  const nowMs = targetDate.getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  // Filter items saved in the past 7 days (or fallback to recent active items if empty)
  let weeklyItems = active.filter((b) => {
    const bDate = getBookmarkDate(b);
    return nowMs - bDate.getTime() <= sevenDaysMs && nowMs - bDate.getTime() >= 0;
  });

  // Fallback: If library is smaller or saved long ago, use the latest active items so gazette is never blank
  if (weeklyItems.length === 0) {
    weeklyItems = active.slice(0, 10);
  }

  // 1. Calculate Ledger
  const totalCaptured = weeklyItems.length;
  const readCount = weeklyItems.filter((b) => !b.unread).length;
  const minutesInvested = weeklyItems.reduce((acc, b) => acc + (b.ty === "ART" ? b.mins || 0 : 0), 0);

  // Dominant kind
  const kindCounts = new Map<KindType, number>();
  weeklyItems.forEach((b) => kindCounts.set(b.ty, (kindCounts.get(b.ty) || 0) + 1));
  let dominantKind: KindType = "ART";
  let maxKindCount = 0;
  kindCounts.forEach((count, k) => {
    if (count > maxKindCount) {
      maxKindCount = count;
      dominantKind = k;
    }
  });

  // Top Topic & Breakdown
  const tagCounts = new Map<string, number>();
  weeklyItems.forEach((b) => {
    const t = b.tag || "general";
    tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
  });
  let topTopic = "general";
  let maxTopicCount = 0;
  tagCounts.forEach((count, t) => {
    if (count > maxTopicCount) {
      maxTopicCount = count;
      topTopic = t;
    }
  });

  const topicBreakdown = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalCaptured > 0 ? Math.round((count / totalCaptured) * 100) : 0,
    }));

  const tilNotesMinted = weeklyItems.filter((b) => Boolean(b.note && b.note.trim().length > 10)).length;

  const ledger: GazetteLedger = {
    totalCaptured,
    readCount,
    minutesInvested,
    topTopic,
    dominantKind,
    tilNotesMinted,
  };

  // 2. Select Lead Story (prioritize articles with notes or highest minutes/useCount)
  const sortedCandidates = [...weeklyItems].sort((a, b) => {
    const aScore = (a.note ? 20 : 0) + (a.mins || 0) + (a.useCount || 0) * 5;
    const bScore = (b.note ? 20 : 0) + (b.mins || 0) + (b.useCount || 0) * 5;
    return bScore - aScore;
  });

  const leadStory = sortedCandidates[0] || null;
  const editorialHighlights = sortedCandidates.slice(1, 5);

  // 3. Select Vault Resurfaced (items older than 30 days)
  const vaultCandidates = active.filter((b) => {
    const bDate = getBookmarkDate(b);
    return nowMs - bDate.getTime() > 30 * 24 * 60 * 60 * 1000;
  });

  const vaultResurfaced = vaultCandidates.slice(0, 3);

  return {
    issueNumber,
    volumeNumber,
    dateRange,
    publishedDate,
    leadStory,
    editorialHighlights,
    vaultResurfaced,
    ledger,
    topicBreakdown,
  };
}

/**
 * Serializes a Gazette Issue into clean Markdown for exporting to Obsidian/Notion/Newsletter.
 */
export function exportGazetteMarkdown(issue: HoardGazetteIssue): string {
  const parts: string[] = [];

  parts.push(`# 📰 THE HOARD GAZETTE`);
  parts.push(`*Vol. ${issue.volumeNumber} · Issue ${issue.issueNumber} · ${issue.dateRange}*\n`);
  parts.push(`Published: ${issue.publishedDate}\n`);
  parts.push(`---\n`);

  // Weekly Ledger
  parts.push(`## 📊 The Weekly Ledger`);
  parts.push(`- **Hoards Captured**: ${issue.ledger.totalCaptured}`);
  parts.push(`- **Completed Reads**: ${issue.ledger.readCount}`);
  parts.push(`- **Reading Time Invested**: ~${issue.ledger.minutesInvested} mins`);
  parts.push(`- **Top Topic**: #${issue.ledger.topTopic}`);
  parts.push(`- **Knowledge Notes Minted**: ${issue.ledger.tilNotesMinted}\n`);

  // Lead Story
  if (issue.leadStory) {
    parts.push(`## ⚡ Lead Story: ${issue.leadStory.t}`);
    parts.push(`- **Source**: ${issue.leadStory.src} (${issue.leadStory.url})`);
    parts.push(`- **Type**: ${issue.leadStory.ty} | **Tag**: #${issue.leadStory.tag}`);
    if (issue.leadStory.note) {
      parts.push(`\n> "${issue.leadStory.note}"\n`);
    }
  }

  // Editorial Highlights
  if (issue.editorialHighlights.length > 0) {
    parts.push(`## 📌 In This Issue`);
    issue.editorialHighlights.forEach((b) => {
      parts.push(`### ${b.t}`);
      parts.push(`- Link: ${b.url}`);
      parts.push(`- ${b.ty} · #${b.tag} · ${b.src}`);
      if (b.note) parts.push(`  *Takeaway*: ${b.note}`);
    });
    parts.push("");
  }

  // Vault Resurfacing
  if (issue.vaultResurfaced.length > 0) {
    parts.push(`## 🏛️ From the Deep Vault (Resurfaced)`);
    issue.vaultResurfaced.forEach((b) => {
      parts.push(`- [${b.t}](${b.url}) — #${b.tag}`);
    });
    parts.push("");
  }

  parts.push(`---\n*Synthesized autonomously by HOARD.*`);

  return parts.join("\n");
}
