import type { DayBlock } from "./types";
import { formatMinutes, minutesSinceMidnight, parseHm } from "./format";

export type PocketState = "busy" | "free" | "wind";

export type Pocket = {
  state: PocketState;
  minutesLeft: number;
  blockTitle: string | null;
  nextTitle: string | null;
  nowPercent: number;
  line: string;
};

type TimedBlock = DayBlock & { startMin: number; endMin: number };

function timed(blocks: DayBlock[]): TimedBlock[] {
  return blocks
    .map((block) => ({
      ...block,
      startMin: parseHm(block.start),
      endMin: parseHm(block.end),
    }))
    .filter((block) => block.endMin > block.startMin)
    .sort((a, b) => a.startMin - b.startMin);
}

export function currentPocket(
  blocks: DayBlock[],
  now: Date,
  freeMinutesToday: number,
): Pocket {
  const nowMin = minutesSinceMidnight(now);
  const nowPercent = Math.round((nowMin / (24 * 60)) * 100);
  const scheduled = timed(blocks);
  const current = scheduled.find((block) => nowMin >= block.startMin && nowMin < block.endMin) ?? null;
  const next = scheduled.find((block) => block.startMin > nowMin) ?? null;

  if (current) {
    const minutesLeft = Math.max(1, current.endMin - nowMin);
    return {
      state: "busy",
      minutesLeft,
      blockTitle: current.title,
      nextTitle: next?.title ?? null,
      nowPercent,
      line: `In ${current.title} · ${formatMinutes(minutesLeft)} left.${
        next ? ` After: ${next.title}.` : ""
      }`,
    };
  }

  if (next) {
    const minutesLeft = Math.max(1, next.startMin - nowMin);
    return {
      state: "free",
      minutesLeft,
      blockTitle: null,
      nextTitle: next.title,
      nowPercent,
      line: `Free pocket · ${formatMinutes(minutesLeft)} until ${next.title}. Do not start something longer.`,
    };
  }

  if (now.getHours() >= 20) {
    return {
      state: "wind",
      minutesLeft: Math.max(0, 24 * 60 - nowMin),
      blockTitle: null,
      nextTitle: null,
      nowPercent,
      line: "Evening wind · deep work is closed. Shallow only.",
    };
  }

  return {
    state: "free",
    minutesLeft: freeMinutesToday,
    blockTitle: null,
    nextTitle: null,
    nowPercent,
    line:
      freeMinutesToday > 0
        ? `Open day · ${formatMinutes(freeMinutesToday)} free.`
        : "Open day · no free minutes on the plan.",
  };
}
