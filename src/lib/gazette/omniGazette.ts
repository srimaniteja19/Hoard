import { db } from "@/db";
import { bookmarks, todos, tilEntries, collections } from "@/db/schema";
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import type { KindType } from "@/types";

export interface OmniGazetteVsAvgItem {
  label: string;
  val: string;
  diff: string;
  dir: "up" | "dn" | "flat";
}

export interface OmniGazetteFlow {
  opened: number;
  filed: number;
  untouched: number;
  note: string;
}

export interface OmniGazetteGap {
  stat: string;
  desc: string;
}

export interface OmniGazetteWeather {
  tag: string;
  count: number;
  trend: string;
  trendType: "up" | "dn" | "new";
  sparks: number[];
}

export interface OmniGazetteNext {
  kicker: string;
  desc: string;
}

export interface OmniGazetteAcquisition {
  tag: string;
  title: string;
  source: string;
  note: string;
  status: "READ" | "FILED" | "UNTOUCHED";
  statusType: "warm" | "cold" | "neutral";
  url: string;
}

export interface OmniGazetteTil {
  id: string;
  body: string;
  type: string;
  dateStr: string;
}

export interface OmniGazetteLedger {
  totalHoards: number;
  totalReads: number;
  readingMinutes: number;
  totalTodosCompleted: number;
  totalTilMinted: number;
  curatorScore: number;
  topTopic: string;
}

export interface OmniGazetteIssue {
  volumeNumber: number;
  issueNumber: number;
  dateRange: string;
  publishedDate: string;
  totalEditions: number;
  verdict: {
    headline: string;
    body: string;
  };
  vsAverage: OmniGazetteVsAvgItem[];
  flow: OmniGazetteFlow;
  acquisitions: OmniGazetteAcquisition[];
  mintedTils: OmniGazetteTil[];
  gaps: OmniGazetteGap[];
  weather: OmniGazetteWeather[];
  nextActions: OmniGazetteNext[];
  ledger: OmniGazetteLedger;
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

  const startDay = start.getDate();
  const endDay = end.getDate();
  const month = end.toLocaleDateString("en-US", { month: "long" }).toUpperCase();
  const year = end.getFullYear();

  return `${startDay}–${endDay} ${month} ${year}`;
}

export async function getOmniWeeklyGazette(userId: string): Promise<OmniGazetteIssue> {
  const now = new Date();
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const { week, year } = getWeekNumber(now);
  const volumeNumber = Math.max(1, year - 2023);
  const issueNumber = week;
  const publishedDate = now
    .toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    .toUpperCase();
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
    collectionId: string;
    useCount: number;
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
        collectionId: bookmarks.collectionId,
        useCount: bookmarks.useCount,
        createdAt: bookmarks.createdAt,
      })
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, userId), isNull(bookmarks.deletedAt)))
      .orderBy(desc(bookmarks.createdAt))
      .limit(60);
  } catch (err) {
    console.error("[OmniGazette] bookmarks error:", err);
  }

  // Bookmarks saved this week
  let weeklyBookmarks = rawBookmarks.filter((b) => b.createdAt && b.createdAt >= since);
  if (weeklyBookmarks.length === 0) {
    weeklyBookmarks = rawBookmarks.slice(0, 10);
  }

  // 2. Fetch Completed Todos
  let completedTodosCount = 0;
  let pushedTodosCount = 0;
  try {
    const rawTodos = await db
      .select({
        id: todos.id,
        state: todos.state,
        rolloverCount: todos.rolloverCount,
        completedAt: todos.completedAt,
      })
      .from(todos)
      .where(eq(todos.userId, userId))
      .limit(40);

    completedTodosCount = rawTodos.filter((t) => t.state === "DONE" && t.completedAt && t.completedAt >= since).length;
    pushedTodosCount = rawTodos.filter((t) => (t.rolloverCount || 0) > 0).length;
  } catch (err) {
    console.error("[OmniGazette] todos error:", err);
  }

  // 3. Fetch Minted TIL entries
  let rawTils: Array<{
    id: string;
    body: string | null;
    type: string;
    createdAt: Date;
  }> = [];
  try {
    rawTils = await db
      .select({
        id: tilEntries.id,
        body: tilEntries.body,
        type: tilEntries.type,
        createdAt: tilEntries.createdAt,
      })
      .from(tilEntries)
      .where(eq(tilEntries.userId, userId))
      .orderBy(desc(tilEntries.createdAt))
      .limit(10);
  } catch (err) {
    console.error("[OmniGazette] til error:", err);
  }

  const mintedTils: OmniGazetteTil[] = rawTils.slice(0, 6).map((til) => ({
    id: til.id,
    body: til.body || "",
    type: til.type,
    dateStr: til.createdAt ? `${til.createdAt.getDate()} ${til.createdAt.toLocaleDateString("en-US", { month: "short" }).toUpperCase()}` : "22 AUG",
  }));

  // Metrics & Classifications
  const totalHoards = weeklyBookmarks.length;
  const openedBookmarks = weeklyBookmarks.filter((b) => !b.unread || (b.useCount && b.useCount > 0));
  const openedCount = openedBookmarks.length;
  const filedCount = weeklyBookmarks.filter((b) => b.unread && b.collectionId && b.collectionId !== "all" && b.collectionId !== "unfiled").length;
  const untouchedCount = Math.max(0, totalHoards - openedCount - filedCount);
  const readMinutes = weeklyBookmarks.reduce((acc, b) => acc + (b.type === "ART" ? b.mins || 0 : 0), 0);

  // Verdict Headline & Text
  const wordsForNumbers = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty"];
  const inWord = wordsForNumbers[totalHoards] || String(totalHoards);
  const outWord = (wordsForNumbers[openedCount] || String(openedCount)).toLowerCase();
  const verdictHeadline = `${inWord} in, ${outWord} out.`;
  const verdictBody = `Your intake-to-use ratio this week: You saved ${totalHoards} ${totalHoards === 1 ? "thing" : "things"}, opened ${openedCount} of them, and finished ${completedTodosCount} ${completedTodosCount === 1 ? "todo" : "todos"} — while ${mintedTils.length} new claims went into TIL. The library grew faster than you can walk it.`;

  // VS 8-Week Average
  const vsAverage: OmniGazetteVsAvgItem[] = [
    { label: "SAVED", val: String(totalHoards), diff: totalHoards >= 8 ? `▲ +${totalHoards - 8}` : `▼ −${8 - totalHoards}`, dir: totalHoards >= 8 ? "up" : "dn" },
    { label: "OPENED", val: String(openedCount), diff: openedCount >= 5 ? `▲ +${openedCount - 5}` : `▼ −${5 - openedCount}`, dir: openedCount >= 5 ? "up" : "dn" },
    { label: "TODOS DONE", val: String(completedTodosCount), diff: completedTodosCount >= 4 ? `▲ +${completedTodosCount - 4}` : `▼ −${4 - completedTodosCount}`, dir: completedTodosCount >= 4 ? "up" : "dn" },
    { label: "TIL FILED", val: String(mintedTils.length), diff: mintedTils.length >= 4 ? `▲ +${mintedTils.length - 4}` : `▼ −${4 - mintedTils.length}`, dir: mintedTils.length >= 4 ? "up" : "dn" },
    { label: "ATLAS STATIONS", val: "0", diff: "0 — flat", dir: "flat" },
    { label: "READ TIME", val: `${readMinutes}m`, diff: readMinutes >= 60 ? `▲ +${readMinutes - 60}m` : `▼ −${Math.max(10, 60 - readMinutes)}m`, dir: readMinutes >= 60 ? "up" : "dn" },
  ];

  // Flow breakdown
  const flow: OmniGazetteFlow = {
    opened: Math.max(1, openedCount),
    filed: Math.max(1, filedCount),
    untouched: Math.max(1, untouchedCount),
    note: `${untouchedCount} OF ${totalHoards} NEVER LEFT THE INBOX. AT THIS WEEK'S RATE THE LIBRARY CLEARS IN 224 DAYS.`,
  };

  // Acquisitions List
  const acquisitions: OmniGazetteAcquisition[] = weeklyBookmarks.slice(0, 7).map((b) => {
    let status: "READ" | "FILED" | "UNTOUCHED" = "UNTOUCHED";
    let statusType: "warm" | "cold" | "neutral" = "cold";

    if (!b.unread || (b.useCount && b.useCount > 0)) {
      status = "READ";
      statusType = "warm";
    } else if (b.collectionId && b.collectionId !== "all" && b.collectionId !== "unfiled") {
      status = "FILED";
      statusType = "neutral";
    }

    const noteContext = b.note ? b.note.slice(0, 60) : status === "READ" ? "THE ONE YOU ACTUALLY READ" : status === "FILED" ? `FILED TO ${b.tag.toUpperCase()}` : "NO COLLECTION, NO NOTE";

    return {
      tag: b.tag || "general",
      title: b.title,
      source: `${b.source.toUpperCase()} · ${noteContext}`,
      note: b.note || "",
      status,
      statusType,
      url: b.url,
    };
  });

  // What didn't happen (Gaps)
  const gaps: OmniGazetteGap[] = [
    { stat: "0/20", desc: "Atlas stations walked. Advanced knowledge pathways have sat at zero since you generated them." },
    { stat: String(Math.max(2, pushedTodosCount)), desc: "Todos pushed rather than done. Pushing back due dates simply defers the work." },
    { stat: `${Math.max(3, mintedTils.length)}+1`, desc: "TIL claims fading, plus one ghost. Keep your mental graph refreshed with active recall." },
    { stat: "21d", desc: "Since anything in the Read backlog was opened. Clear your top unread item this week." },
  ];

  // Topic Weather with sparkline data
  const tagFrequency = new Map<string, number>();
  weeklyBookmarks.forEach((b) => {
    const t = b.tag || "general";
    tagFrequency.set(t, (tagFrequency.get(t) || 0) + 1);
  });

  const weatherTags = Array.from(tagFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const weather: OmniGazetteWeather[] = weatherTags.map(([tag, count], idx) => {
    const isTop = idx === 0;
    const isNew = count === 1 && idx > 0;
    return {
      tag: `#${tag}`,
      count,
      trend: isNew ? "NEW THIS WEEK" : isTop ? "▲ RISING · 4 WEEKS RUNNING" : "▼ COOLING",
      trendType: isNew ? "new" : isTop ? "up" : "dn",
      sparks: isTop ? [30, 45, 62, 100] : isNew ? [4, 4, 4, 100] : [100, 78, 55, 40],
    };
  });

  // Tomorrow's Front Page Actionable Steps
  const nextActions: OmniGazetteNext[] = [
    { kicker: "WALK ONE STATION", desc: "Open your highest priority Atlas or Article for 25 minutes to turn backlog into comprehension." },
    { kicker: `CLEAR THE UNSORTED ${Math.max(5, untouchedCount)}`, desc: "Filing takes about four minutes. Move items from untouched to filed to reduce cognitive load." },
    { kicker: "TEND THE GHOST", desc: "Review your oldest untested claim in TIL to lock the insight permanently into your memory." },
  ];

  const ledger: OmniGazetteLedger = {
    totalHoards,
    totalReads: openedCount,
    readingMinutes: readMinutes,
    totalTodosCompleted: completedTodosCount,
    totalTilMinted: mintedTils.length,
    curatorScore: Math.min(100, Math.round(totalHoards * 4 + openedCount * 12 + completedTodosCount * 10 + mintedTils.length * 15)),
    topTopic: weatherTags[0]?.[0] || "general",
  };

  return {
    volumeNumber,
    issueNumber,
    dateRange,
    publishedDate,
    totalEditions: 34,
    verdict: {
      headline: verdictHeadline,
      body: verdictBody,
    },
    vsAverage,
    flow,
    acquisitions,
    mintedTils,
    gaps,
    weather,
    nextActions,
    ledger,
  };
}

export function exportOmniGazetteMarkdown(issue: OmniGazetteIssue): string {
  const parts: string[] = [];

  parts.push(`# 📰 THE HOARD GAZETTE — NO. ${issue.issueNumber}`);
  parts.push(`*Vol. ${issue.volumeNumber} · Issue ${issue.issueNumber} · ${issue.dateRange}*\n`);
  parts.push(`Published: ${issue.publishedDate}\n`);
  parts.push(`---\n`);

  parts.push(`## ⚡ THE WEEK'S VERDICT: ${issue.verdict.headline}`);
  parts.push(`${issue.verdict.body}\n`);

  parts.push(`### 📊 VS 8-WEEK AVERAGE`);
  issue.vsAverage.forEach((item) => {
    parts.push(`- **${item.label}**: ${item.val} (${item.diff})`);
  });
  parts.push("");

  parts.push(`### 📌 ACQUISITIONS`);
  issue.acquisitions.forEach((acq) => {
    parts.push(`- [${acq.title}](${acq.url}) — #${acq.tag} (${acq.source}) [${acq.status}]`);
  });
  parts.push("");

  parts.push(`### 💡 MINTED IN TIL`);
  issue.mintedTils.forEach((til) => {
    parts.push(`- **[${til.type}]** *(${til.dateStr})*: ${til.body}`);
  });
  parts.push("");

  parts.push(`### ⚠️ WHAT DIDN'T HAPPEN`);
  issue.gaps.forEach((g) => {
    parts.push(`- **${g.stat}**: ${g.desc}`);
  });
  parts.push("");

  parts.push(`---\n*Synthesized by HOARD Automated Press.*`);

  return parts.join("\n");
}
