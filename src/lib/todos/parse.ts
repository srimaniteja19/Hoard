/**
 * Natural-language todo capture parser — TODOS.md §3.
 *
 * A pure function, deliberately free of React and DB imports (not even
 * type-only ones) so both the web capture bar and the browser extension can
 * import it directly with no coupling to either.
 *
 * Tokens are stripped from the title in the order listed in TODOS.md §3.
 * Due-date and reminder-time tokens are deliberately conservative: they only
 * fire when trailing (the last word(s) of the remaining text) or introduced
 * by an explicit preposition (on/by/due/for/at) — never when they're just a
 * word inside a noun phrase ("plan the Monday standup" should not set a due
 * date; "read 3pm article" should not set a reminder). That's the one
 * heuristic this file leans on hardest; see the fixture file for the cases
 * it's built to get right.
 */

export type Energy = "DEEP" | "SHALLOW" | "ERRAND";

export type ParsedTodo = {
  title: string;
  estimatedMinutes: number;
  energy: Energy;
  dueOffsetDays: number | null;
  remindAtLocal: string | null; // "HH:mm"
  recurrenceRule: string | null;
  tags: string[];
  urgent: boolean;
  matched: { token: string; field: string }[];
};

const WEEKDAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const WEEKDAY_FULL: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

const MINUTE_VERBS = ["email", "reply", "call", "text", "book"];
const ERRAND_TOKENS = ["call", "buy", "pick up", "errand", "book"];
const DEEP_TOKENS = ["deep", "focus"];

const LEADING_PREPOSITIONS = ["on", "by", "due", "for"];

function todayWeekdayIndex(today: Date, tz: string): number {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" })
    .format(today)
    .toLowerCase()
    .slice(0, 3);
  const idx = WEEKDAY_NAMES.indexOf(wd);
  return idx === -1 ? today.getUTCDay() : idx;
}

/** Local day-of-month in the given timezone — never the raw UTC date. */
function todayLocalDate(today: Date, tz: string): number {
  const day = new Intl.DateTimeFormat("en-US", { timeZone: tz, day: "2-digit" }).format(today);
  return Number(day);
}

/** Collapse repeated whitespace left behind by stripping tokens out of the title. */
function collapse(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function parseTodo(input: string, today: Date, tz: string): ParsedTodo {
  let text = input;
  const matched: { token: string; field: string }[] = [];

  let estimatedMinutes: number | null = null;
  let energy: Energy | null = null;
  let dueOffsetDays: number | null = null;
  let remindAtLocal: string | null = null;
  let recurrenceRule: string | null = null;
  const tags: string[] = [];
  let urgent = false;

  // 1. Estimate — ~30m, ~2h
  text = text.replace(/~(\d+)\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes)\b/gi, (full, num, unit) => {
    const n = Number(num);
    const isHours = /^h/i.test(unit);
    estimatedMinutes = isHours ? n * 60 : n;
    matched.push({ token: full.trim(), field: "estimatedMinutes" });
    return " ";
  });

  // 2. Tags — #tag (multiple allowed), unicode-aware
  text = text.replace(/#([\p{L}\p{N}_-]+)/gu, (full, tag) => {
    tags.push(tag);
    matched.push({ token: full, field: "tags" });
    return " ";
  });

  // 3. Urgency — !, !!, !!!
  text = text.replace(/(^|\s)(!{1,3})(?=\s|$)/g, (full, pre, bangs) => {
    urgent = true;
    matched.push({ token: bangs, field: "urgent" });
    return pre === "" ? "" : pre;
  });

  // 4. Recurrence — every day/weekday/week/month/<weekday>
  text = text.replace(
    /\bevery\s+(day|weekday|week|month|sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)\b/gi,
    (full, unit) => {
      const u = unit.toLowerCase();
      if (u === "day") recurrenceRule = "daily";
      else if (u === "weekday") recurrenceRule = "weekdays";
      else if (u === "week") recurrenceRule = `weekly:${WEEKDAY_NAMES[todayWeekdayIndex(today, tz)].toUpperCase()}`;
      else if (u === "month") recurrenceRule = `monthly:${String(todayLocalDate(today, tz)).padStart(2, "0")}`;
      else {
        const dow = WEEKDAY_FULL[u];
        recurrenceRule = `weekly:${WEEKDAY_NAMES[dow].toUpperCase()}`;
      }
      matched.push({ token: full.trim(), field: "recurrenceRule" });
      return " ";
    }
  );

  // 5. Due date — today/tomorrow/tmrw/<weekday>/next week — trailing or preposition-led only
  {
    const dueWordPattern =
      "(today|tomorrow|tmrw|next\\s+week|sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)";
    const prepositionLed = new RegExp(`\\b(${LEADING_PREPOSITIONS.join("|")})\\s+${dueWordPattern}\\b`, "i");
    const trailing = new RegExp(`\\b${dueWordPattern}\\s*$`, "i");

    const applyDue = (word: string): number => {
      const w = word.toLowerCase();
      if (w === "today") return 0;
      if (w === "tomorrow" || w === "tmrw") return 1;
      if (w === "next week") return 7;
      const dow = WEEKDAY_FULL[w];
      return (dow - todayWeekdayIndex(today, tz) + 7) % 7;
    };

    let m = text.match(prepositionLed);
    if (m) {
      dueOffsetDays = applyDue(m[2]);
      matched.push({ token: m[0].trim(), field: "dueOffsetDays" });
      text = text.slice(0, m.index) + text.slice((m.index ?? 0) + m[0].length);
    } else {
      m = text.match(trailing);
      if (m) {
        dueOffsetDays = applyDue(m[1]);
        matched.push({ token: m[0].trim(), field: "dueOffsetDays" });
        text = text.slice(0, m.index);
      }
    }
  }

  // 6. Reminder time — 3pm, at 15:00, 9:30am — trailing or "at"-led only
  {
    const timePattern = "(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm)|(\\d{1,2}):(\\d{2})";
    const atLed = new RegExp(`\\bat\\s+(?:${timePattern})\\b`, "i");
    const trailing = new RegExp(`\\b(?:${timePattern})\\s*$`, "i");

    const toHHmm = (h12: string | undefined, min12: string | undefined, ampm: string | undefined, h24: string | undefined, min24: string | undefined): string => {
      if (h24 !== undefined) {
        return `${h24.padStart(2, "0")}:${min24}`;
      }
      let h = Number(h12);
      const min = min12 ?? "00";
      const isPm = ampm!.toLowerCase() === "pm";
      if (isPm && h !== 12) h += 12;
      if (!isPm && h === 12) h = 0;
      return `${String(h).padStart(2, "0")}:${min}`;
    };

    let m = text.match(atLed);
    if (m) {
      remindAtLocal = toHHmm(m[1], m[2], m[3], m[4], m[5]);
      matched.push({ token: m[0].trim(), field: "remindAtLocal" });
      text = text.slice(0, m.index) + text.slice((m.index ?? 0) + m[0].length);
    } else {
      m = text.match(trailing);
      if (m) {
        remindAtLocal = toHHmm(m[1], m[2], m[3], m[4], m[5]);
        matched.push({ token: m[0].trim(), field: "remindAtLocal" });
        text = text.slice(0, m.index);
      }
    }
  }

  // Capture the leading word now, before the errand-token stripping below
  // can remove it — "call mom" must still infer 10 minutes from "call" even
  // though "call" is also stripped out as an ERRAND energy token.
  const leadingWordForMinutes = collapse(text).split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "") ?? "";

  // 7. Energy — deep/focus → DEEP
  for (const word of DEEP_TOKENS) {
    const re = new RegExp(`\\b${word}\\b`, "i");
    const m = text.match(re);
    if (m) {
      energy = "DEEP";
      matched.push({ token: m[0], field: "energy" });
      text = text.replace(re, " ");
      break;
    }
  }

  // 8. Energy — call/buy/pick up/errand/book → ERRAND
  if (!energy) {
    for (const word of ERRAND_TOKENS) {
      const re = new RegExp(`\\b${word}\\b`, "i");
      const m = text.match(re);
      if (m) {
        energy = "ERRAND";
        matched.push({ token: m[0], field: "energy" });
        text = text.replace(re, " ");
        break;
      }
    }
  }

  const title = collapse(text);

  // Inference: minutes from a leading verb if no explicit estimate was given.
  if (estimatedMinutes === null) {
    estimatedMinutes = MINUTE_VERBS.includes(leadingWordForMinutes) ? 10 : 25;
  }

  // Inference: energy from minutes if no explicit energy token was given.
  if (!energy) {
    energy = estimatedMinutes >= 40 ? "DEEP" : "SHALLOW";
  }

  return {
    title,
    estimatedMinutes,
    energy,
    dueOffsetDays,
    remindAtLocal,
    recurrenceRule,
    tags,
    urgent,
    matched,
  };
}
