import { localDateKey } from "./format";

export const SKIP_TODAY_KEY = "hoard:skipToday";

export type Kv = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

type SkipPayload = {
  date: string;
  ids: string[];
};

function readPayload(storage: Kv, today: string): SkipPayload {
  try {
    const raw = storage.getItem(SKIP_TODAY_KEY);
    if (!raw) return { date: today, ids: [] };
    const parsed = JSON.parse(raw) as Partial<SkipPayload>;
    if (parsed.date !== today || !Array.isArray(parsed.ids)) {
      return { date: today, ids: [] };
    }
    return { date: today, ids: parsed.ids.filter((id): id is string => typeof id === "string") };
  } catch {
    return { date: today, ids: [] };
  }
}

export function readSkippedIds(storage: Kv, now: Date = new Date()): string[] {
  return readPayload(storage, localDateKey(now)).ids;
}

export function skipIdToday(storage: Kv, id: string, now: Date = new Date()): string[] {
  const today = localDateKey(now);
  const payload = readPayload(storage, today);
  if (!payload.ids.includes(id)) payload.ids.push(id);
  storage.setItem(SKIP_TODAY_KEY, JSON.stringify(payload));
  return payload.ids;
}
