import { ScrapRow, ScrapKind } from "@/db/schema";

export interface WeekBounds {
  weekStart: string;
  weekEnd: string;
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Monday-Sunday bounds for the calendar week containing `date`. */
export function getWeekBounds(date: Date): WeekBounds {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return { weekStart: toIso(monday), weekEnd: toIso(sunday) };
}

export interface PostcardHighlight {
  scrapId: string;
  content: string;
  kind: ScrapKind;
}

export interface PostcardData {
  kindTallies: Record<string, number>;
  totalCount: number;
  daysLogged: number;
  highlight: PostcardHighlight | null;
}

function pickHighlight(weekScraps: ScrapRow[]): PostcardHighlight | null {
  const quotes = weekScraps.filter((s) => s.kind === "QUOTE");
  if (quotes.length > 0) {
    const best = quotes.reduce((a, b) => {
      if (b.content.length !== a.content.length) {
        return b.content.length > a.content.length ? b : a;
      }
      return new Date(b.createdAt) < new Date(a.createdAt) ? b : a;
    });
    return { scrapId: best.id, content: best.content, kind: best.kind as ScrapKind };
  }

  const pinned = weekScraps.filter((s) => s.entities?.isPinned && s.entities?.pinnedAt);
  if (pinned.length > 0) {
    const best = pinned.reduce((a, b) =>
      new Date(b.entities!.pinnedAt!) > new Date(a.entities!.pinnedAt!) ? b : a
    );
    return { scrapId: best.id, content: best.content, kind: best.kind as ScrapKind };
  }

  const welded = weekScraps.filter((s) => (s.threadN || 0) > 0);
  if (welded.length > 0) {
    const best = welded.reduce((a, b) => ((b.threadN || 0) > (a.threadN || 0) ? b : a));
    return { scrapId: best.id, content: best.content, kind: best.kind as ScrapKind };
  }

  return null;
}

/** weekScraps must already be filtered to the target week's loggedFor range and not buried. */
export function computePostcardData(weekScraps: ScrapRow[]): PostcardData {
  const kindTallies: Record<string, number> = {};
  const loggedDays = new Set<string>();

  for (const scrap of weekScraps) {
    kindTallies[scrap.kind] = (kindTallies[scrap.kind] || 0) + 1;
    loggedDays.add(scrap.loggedFor);
  }

  return {
    kindTallies,
    totalCount: weekScraps.length,
    daysLogged: loggedDays.size,
    highlight: pickHighlight(weekScraps),
  };
}
