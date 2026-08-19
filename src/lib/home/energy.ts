import type { ContextType } from "@/types";
import type { Pocket } from "./pocket";

export function suggestedContext(now: Date, pocket: Pocket): ContextType {
  if (pocket.state === "wind" || now.getHours() >= 20) return "wind";
  const weekday = now.getDay() >= 1 && now.getDay() <= 5;
  if (weekday && now.getHours() >= 6 && now.getHours() < 12) return "desk";
  return "all";
}

export function preferDeepWork(now: Date, pocket: Pocket): boolean {
  const weekday = now.getDay() >= 1 && now.getDay() <= 5;
  return (
    weekday &&
    now.getHours() >= 6 &&
    now.getHours() < 12 &&
    pocket.state === "free" &&
    pocket.minutesLeft >= 40
  );
}
