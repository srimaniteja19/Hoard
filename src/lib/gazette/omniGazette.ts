import { db } from "@/db";
import { bookmarks, todos, tilEntries } from "@/db/schema";
import { and, desc, eq, gte, isNull } from "drizzle-orm";
import type { KindType } from "@/types";

export interface OmniGazetteLedger {
  totalHoards: number;
  totalReads: number;
  readingMinutes: number;
  totalTodosCompleted: number;
  totalTilMinted: number;
  curatorScore: number;
  topTopic: string;
}

export interface OmniGazetteTodo {
  id: string;
  title: string;
  completedAt: string;
  energy?: string;
}

export interface OmniGazetteTil {
  id: string;
  body: string;
  type: string;
  tags: string[];
  createdAt: string;
}

export interface OmniGazetteBookmark {
  id: number;
  title: string;
  url: string;
  kind: KindType;
  tag: string;
  source: string;
  mins: number;
  note?: string;
  unread: boolean;
}

export interface OmniGazetteIssue {
  volumeNumber: number;
  issueNumber: number;
  dateRange: string;
  publishedDate: string;
  ledger: OmniGazetteLedger;
  leadStory: OmniGazetteBookmark | null;
  weeklyHoards: OmniGazetteBookmark[];
  completedTodos: OmniGazetteTodo[];
  mintedTils: OmniGazetteTil[];
  vaultResurfaced: OmniGazetteBookmark[];
  topicBreakdown: Array<{ name: string; count: number; percentage: number }>;
}

function getWeekNumber(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { week: weekNo, year: d.getUTCFullYear() };
}

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

export async function getOmniWeeklyGazette(userId: string): Promise<OmniGazetteIssue> {
  const now = new Date();
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const { week, year } = getWeekNumber(now);
  const volumeNumber = Math.max(1, year - 2023);
  const issueNumber = week;
  const publishedDate = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const dateRange = formatWeekDateRange(now);

  // 1. Fetch Bookmarks
  let rawBookmarks: Array<{
    id: number;
    title: string;
    url: string;
    type: KindType;
    tag: string;
    source: string;
    mins: number;
    note: string;
    unread: boolean;
    createdAt: Date;
  }> = [];

  try {
    rawBookmarks = await db
      .select({
        id: bookmarks.id,
        title: bookmarks.title,
        url: bookmarks.url,
        type: bookmarks.type,
        tag: bookmarks.tag,
        source: bookmarks.source,
        mins: bookmarks.mins,
        note: bookmarks.note,
        unread: bookmarks.unread,
        createdAt: bookmarks.createdAt,
      })
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, userId), isNull(bookmarks.deletedAt)))
      .orderBy(desc(bookmarks.createdAt))
      .limit(50);
  } catch (err) {
    console.error("[OmniGazette] bookmarks query error:", err);
  }

  // Filter bookmarks created this week (or recent fallback)
  let weeklyBookmarksRaw = rawBookmarks.filter((b) => b.createdAt && b.createdAt >= since);
  if (weeklyBookmarksRaw.length === 0) {
    weeklyBookmarksRaw = rawBookmarks.slice(0, 8);
  }

  const weeklyHoards: OmniGazetteBookmark[] = weeklyBookmarksRaw.map((b) => ({
    id: b.id,
    title: b.title,
    url: b.url,
    kind: b.type || "ART",
    tag: b.tag || "general",
    source: b.source,
    mins: b.mins || 0,
    note: b.note || undefined,
    unread: b.unread,
  }));

  // 2. Fetch Completed Todos
  let completedTodos: OmniGazetteTodo[] = [];
  try {
    const rawTodos = await db
      .select({
        id: todos.id,
        title: todos.title,
        completedAt: todos.completedAt,
        energy: todos.energy,
      })
      .from(todos)
      .where(and(eq(todos.userId, userId), eq(todos.state, "DONE")))
      .orderBy(desc(todos.completedAt))
      .limit(10);

    completedTodos = rawTodos.map((t) => ({
      id: t.id,
      title: t.title,
      completedAt: t.completedAt ? t.completedAt.toLocaleDateString() : "This week",
      energy: t.energy || undefined,
    }));
  } catch (err) {
    console.error("[OmniGazette] todos query error:", err);
  }

  // 3. Fetch Minted TIL entries
  let mintedTils: OmniGazetteTil[] = [];
  try {
    const rawTils = await db
      .select({
        id: tilEntries.id,
        body: tilEntries.body,
        type: tilEntries.type,
        createdAt: tilEntries.createdAt,
      })
      .from(tilEntries)
      .where(eq(tilEntries.userId, userId))
      .orderBy(desc(tilEntries.createdAt))
      .limit(6);

    mintedTils = rawTils.map((til) => ({
      id: til.id,
      body: til.body || "",
      type: til.type,
      tags: [],
      createdAt: til.createdAt ? til.createdAt.toLocaleDateString() : "This week",
    }));
  } catch (err) {
    console.error("[OmniGazette] til query error:", err);
  }

  // 4. Calculate Ledger & Metrics
  const totalHoards = weeklyHoards.length;
  const totalReads = weeklyHoards.filter((b) => !b.unread).length;
  const readingMinutes = weeklyHoards.reduce((acc, b) => acc + (b.kind === "ART" ? b.mins || 0 : 0), 0);
  const totalTodosCompleted = completedTodos.length;
  const totalTilMinted = mintedTils.length;

  // Topic breakdown
  const tagCounts = new Map<string, number>();
  weeklyHoards.forEach((b) => {
    tagCounts.set(b.tag, (tagCounts.get(b.tag) || 0) + 1);
  });
  let topTopic = "general";
  let maxTagCount = 0;
  tagCounts.forEach((count, tag) => {
    if (count > maxTagCount) {
      maxTagCount = count;
      topTopic = tag;
    }
  });

  const topicBreakdown = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalHoards > 0 ? Math.round((count / totalHoards) * 100) : 0,
    }));

  const curatorScore = Math.min(
    100,
    Math.round(totalHoards * 5 + totalReads * 10 + totalTodosCompleted * 8 + totalTilMinted * 12)
  );

  const ledger: OmniGazetteLedger = {
    totalHoards,
    totalReads,
    readingMinutes,
    totalTodosCompleted,
    totalTilMinted,
    curatorScore,
    topTopic,
  };

  // Lead story selection
  const sortedCandidates = [...weeklyHoards].sort((a, b) => {
    const aScore = (a.note ? 20 : 0) + (a.mins || 0);
    const bScore = (b.note ? 20 : 0) + (b.mins || 0);
    return bScore - aScore;
  });
  const leadStory = sortedCandidates[0] || null;

  // Deep vault candidate
  const vaultCandidates = rawBookmarks.filter((b) => b.createdAt && now.getTime() - b.createdAt.getTime() > 30 * 24 * 60 * 60 * 1000);
  const vaultResurfaced: OmniGazetteBookmark[] = vaultCandidates.slice(0, 3).map((b) => ({
    id: b.id,
    title: b.title,
    url: b.url,
    kind: b.type || "ART",
    tag: b.tag || "general",
    source: b.source,
    mins: b.mins || 0,
    note: b.note || undefined,
    unread: b.unread,
  }));

  return {
    volumeNumber,
    issueNumber,
    dateRange,
    publishedDate,
    ledger,
    leadStory,
    weeklyHoards: weeklyHoards.slice(1, 5),
    completedTodos,
    mintedTils,
    vaultResurfaced,
    topicBreakdown,
  };
}

export function exportOmniGazetteMarkdown(issue: OmniGazetteIssue): string {
  const parts: string[] = [];

  parts.push(`# 📰 THE HOARD GAZETTE — SUNDAY OMNI-EDITION`);
  parts.push(`*Vol. ${issue.volumeNumber} · Issue ${issue.issueNumber} · ${issue.dateRange}*\n`);
  parts.push(`Published: ${issue.publishedDate}\n`);
  parts.push(`---\n`);

  // Weekly Master Ledger
  parts.push(`## 📊 All-Systems Ledger`);
  parts.push(`- **Hoards Added**: ${issue.ledger.totalHoards}`);
  parts.push(`- **Completed Reads**: ${issue.ledger.totalReads}`);
  parts.push(`- **Reading Time**: ~${issue.ledger.readingMinutes} mins`);
  parts.push(`- **Todos Executed**: ${issue.ledger.totalTodosCompleted}`);
  parts.push(`- **TIL Knowledge Minted**: ${issue.ledger.totalTilMinted}`);
  parts.push(`- **Curator Velocity Score**: ${issue.ledger.curatorScore}/100\n`);

  // Lead Story
  if (issue.leadStory) {
    parts.push(`## ⚡ Lead Dispatch: ${issue.leadStory.title}`);
    parts.push(`- **Source**: ${issue.leadStory.source} (${issue.leadStory.url})`);
    if (issue.leadStory.note) {
      parts.push(`\n> "${issue.leadStory.note}"\n`);
    }
  }

  // Executed Todos
  if (issue.completedTodos.length > 0) {
    parts.push(`## ✅ Tasks Shipped & Completed`);
    issue.completedTodos.forEach((t) => {
      parts.push(`- [x] ${t.title} *(Completed ${t.completedAt})*`);
    });
    parts.push("");
  }

  // Minted Knowledge
  if (issue.mintedTils.length > 0) {
    parts.push(`## 💡 Knowledge Constellation Minted`);
    issue.mintedTils.forEach((til) => {
      parts.push(`- **[${til.type}]**: ${til.body}`);
    });
    parts.push("");
  }

  // Weekly Hoards
  if (issue.weeklyHoards.length > 0) {
    parts.push(`## 📌 Weekly Link Hoards`);
    issue.weeklyHoards.forEach((b) => {
      parts.push(`- [${b.title}](${b.url}) — #${b.tag} (${b.source})`);
    });
    parts.push("");
  }

  parts.push(`---\n*Synthesized autonomously by HOARD.*`);

  return parts.join("\n");
}
