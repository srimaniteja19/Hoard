import type { AtlasStatus, AtlasSyllabus } from "./types";

export function weekLoad(
  syllabus: AtlasSyllabus,
  weekId: string,
  budgetMinutes: number
): { openRequired: number; openMinutes: number; overflowMinutes: number } {
  const openRequiredStations = syllabus.stations.filter(
    (s) => s.weekId === weekId && s.required && s.state === "OPEN"
  );
  const openRequired = openRequiredStations.length;
  const openMinutes = openRequiredStations.reduce((sum, s) => sum + s.estimatedMinutes, 0);
  const overflowMinutes = Math.max(0, openMinutes - budgetMinutes);

  return { openRequired, openMinutes, overflowMinutes };
}

export function requiredProgress(syllabus: AtlasSyllabus): { done: number; total: number } {
  const required = syllabus.stations.filter((s) => s.required);
  const done = required.filter((s) => s.state === "DONE").length;
  return { done, total: required.length };
}

export function nextStatusAfterCheck(status: AtlasStatus): AtlasStatus {
  if (status === "draft") return "walking";
  return status;
}
