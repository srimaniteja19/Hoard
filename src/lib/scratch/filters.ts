import { ScrapRow, ScrapKind } from "@/db/schema";
import { getLocalTodayIso } from "./parse";

export type StatusFilter = "all" | "has_notes" | "images" | "raw" | "promoted";

export interface ScratchFilters {
  query: string;
  kind?: ScrapKind | "ALL";
  tag?: string | null;
  date?: string | null; // ISO YYYY-MM-DD
  status?: StatusFilter;
}

export interface TagCount {
  tag: string;
  count: number;
}

export interface DayActivity {
  dateIso: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  scrapCount: number;
  kinds: ScrapKind[];
  hasImages: boolean;
}

/**
 * Extracts all unique #tags from content and notes of given scraps, sorted by count descending
 */
export function extractAllTags(scraps: ScrapRow[]): TagCount[] {
  const counts = new Map<string, number>();

  for (const s of scraps) {
    const combined = `${s.content} ${s.notes || ""}`;
    const matches = combined.match(/#[a-zA-Z][\w-]*/g) || [];
    const uniqueInScrap = new Set(matches.map((t) => t.toLowerCase()));

    for (const tag of uniqueInScrap) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/**
 * Filters scraps based on query, kind, tag, date, and status
 */
export function filterScraps(scraps: ScrapRow[], filters: ScratchFilters): ScrapRow[] {
  const normalizedQuery = (filters.query || "").trim().toLowerCase();
  const selectedKind = filters.kind && filters.kind !== "ALL" ? filters.kind : null;
  const selectedTag = filters.tag ? filters.tag.toLowerCase() : null;
  const selectedDate = filters.date || null;
  const selectedStatus = filters.status || "all";

  return scraps.filter((s) => {
    // 1. Kind filter
    if (selectedKind && s.kind !== selectedKind) {
      return false;
    }

    // 2. Status filter
    if (selectedStatus === "has_notes" && (!s.notes || !s.notes.trim())) {
      return false;
    }
    if (selectedStatus === "images" && !s.content.includes("![") && !(s.notes && s.notes.includes("!["))) {
      return false;
    }
    if (selectedStatus === "raw" && s.status !== "raw") {
      return false;
    }
    if (selectedStatus === "promoted" && !s.promotedTo) {
      return false;
    }

    // 3. Date filter (compares loggedFor YYYY-MM-DD or createdAt date)
    if (selectedDate) {
      const loggedIso = s.loggedFor;
      const createdIso = getLocalTodayIso(new Date(s.createdAt));
      if (loggedIso !== selectedDate && createdIso !== selectedDate) {
        return false;
      }
    }

    // 4. Tag filter
    if (selectedTag) {
      const combined = `${s.content} ${s.notes || ""}`.toLowerCase();
      if (!combined.includes(selectedTag)) {
        return false;
      }
    }

    // 5. Query filter (matches content, notes, kind, tags)
    if (normalizedQuery) {
      const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
      const target = `${s.content} ${s.notes || ""} ${s.kind} ${s.statusLabel || ""}`.toLowerCase();
      for (const token of tokens) {
        if (!target.includes(token)) {
          return false;
        }
      }
    }

    return true;
  });
}

/**
 * Generates calendar matrix data (42 cells / 6 weeks) for a given month and year
 */
export function generateMonthCalendar(
  scraps: ScrapRow[],
  year: number,
  month: number, // 0-indexed (0 = Jan, 11 = Dec)
  selectedDate?: string | null,
  todayIso?: string
): {
  days: DayActivity[];
  totalScrapsInMonth: number;
  monthName: string;
} {
  const currentTodayIso = todayIso || getLocalTodayIso(new Date());
  const monthNames = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
  ];

  // Map scraps by date
  const activityMap = new Map<string, { count: number; kinds: Set<ScrapKind>; hasImages: boolean }>();
  let totalScrapsInMonth = 0;

  for (const s of scraps) {
    const dateKey = s.loggedFor || getLocalTodayIso(new Date(s.createdAt));
    const existing = activityMap.get(dateKey) || { count: 0, kinds: new Set<ScrapKind>(), hasImages: false };
    existing.count++;
    existing.kinds.add(s.kind as ScrapKind);
    if (s.content.includes("![") || (s.notes && s.notes.includes("!["))) {
      existing.hasImages = true;
    }
    activityMap.set(dateKey, existing);
  }

  // Calculate calendar grid dates starting on Monday
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Day of week for 1st day (0 = Sun, 1 = Mon ... 6 = Sat)
  let firstDayWeekday = firstDayOfMonth.getDay();
  // Adjust so Monday is 0, Sunday is 6
  let offset = firstDayWeekday === 0 ? 6 : firstDayWeekday - 1;

  const startDate = new Date(year, month, 1 - offset);
  const days: DayActivity[] = [];

  for (let i = 0; i < 42; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);

    const yearStr = currentDate.getFullYear();
    const monthStr = String(currentDate.getMonth() + 1).padStart(2, "0");
    const dayStr = String(currentDate.getDate()).padStart(2, "0");
    const dateIso = `${yearStr}-${monthStr}-${dayStr}`;

    const isCurrentMonth = currentDate.getMonth() === month;
    const isToday = dateIso === currentTodayIso;
    const isSelected = !!selectedDate && dateIso === selectedDate;

    const activity = activityMap.get(dateIso);
    const scrapCount = activity ? activity.count : 0;
    const kinds = activity ? Array.from(activity.kinds) : [];
    const hasImages = activity ? activity.hasImages : false;

    if (isCurrentMonth && scrapCount > 0) {
      totalScrapsInMonth += scrapCount;
    }

    days.push({
      dateIso,
      dayNumber: currentDate.getDate(),
      isCurrentMonth,
      isToday,
      isSelected,
      scrapCount,
      kinds,
      hasImages,
    });
  }

  return {
    days,
    totalScrapsInMonth,
    monthName: monthNames[month],
  };
}
