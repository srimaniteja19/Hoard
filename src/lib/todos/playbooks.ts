import { PlaybookStep, PlaybookRunStep, PlaybookRow, PlaybookRunRow } from "@/db/schema";

export interface StarterPlaybook {
  id: string;
  name: string;
  color: "violet" | "cyan" | "pink" | "lime" | "orange" | "yellow";
  mode: "SEQUENCE" | "SET";
  runsCount: number;
  medianDuration: string;
  keptPercent: number;
  defaultVars: Record<string, string>;
  steps: PlaybookStep[];
}

export const STARTER_PLAYBOOKS: StarterPlaybook[] = [
  {
    id: "ship",
    name: "Ship a branch",
    color: "violet",
    mode: "SEQUENCE",
    runsCount: 22,
    medianDuration: "2h 10m",
    keptPercent: 82,
    defaultVars: { branch: "auth-migration", ticket: "RIV-412" },
    steps: [
      { title: "Pull main and rebase {{branch}}", energy: "errand", optional: false },
      { title: "Write the code for {{ticket}}", energy: "deep", optional: false },
      { title: "Run the test suite locally", energy: "shallow", optional: false },
      { title: "Self-review the diff first", energy: "shallow", optional: false },
      { title: "Update the changelog", energy: "errand", optional: true },
      { title: "Open the PR and tag reviewers", energy: "shallow", optional: false },
    ],
  },
  {
    id: "review",
    name: "Review a PR",
    color: "cyan",
    mode: "SEQUENCE",
    runsCount: 41,
    medianDuration: "38m",
    keptPercent: 93,
    defaultVars: { pr: "#318", author: "Sam" },
    steps: [
      { title: "Read {{pr}} description before the diff", energy: "shallow", optional: false },
      { title: "Pull {{pr}} and run it", energy: "deep", optional: false },
      { title: "Comment on shape before details", energy: "deep", optional: false },
      { title: "Approve or request changes from {{author}}", energy: "shallow", optional: false },
    ],
  },
  {
    id: "incident",
    name: "Handle an incident",
    color: "pink",
    mode: "SEQUENCE",
    runsCount: 6,
    medianDuration: "3h 40m",
    keptPercent: 67,
    defaultVars: { service: "ingest" },
    steps: [
      { title: "Acknowledge in the channel", energy: "errand", optional: false },
      { title: "Roll back {{service}} before debugging", energy: "deep", optional: false },
      { title: "Find the actual cause", energy: "deep", optional: false },
      { title: "Write the timeline while fresh", energy: "shallow", optional: false },
      { title: "File the follow-ups", energy: "errand", optional: true },
    ],
  },
  {
    id: "week",
    name: "Close the week",
    color: "lime",
    mode: "SET",
    runsCount: 31,
    medianDuration: "24m",
    keptPercent: 71,
    defaultVars: {},
    steps: [
      { title: "Clear the unsorted pile", energy: "shallow", optional: false },
      { title: "Tend anything fading in TIL", energy: "errand", optional: false },
      { title: "Walk one Atlas station", energy: "deep", optional: false },
      { title: "Act on one line from the Gazette", energy: "shallow", optional: true },
    ],
  },
  {
    id: "repo",
    name: "Start a new repo",
    color: "orange",
    mode: "SEQUENCE",
    runsCount: 9,
    medianDuration: "55m",
    keptPercent: 88,
    defaultVars: { repo: "hoard-scratch" },
    steps: [
      { title: "Create {{repo}} with a licence and a real README", energy: "errand", optional: false },
      { title: "Wire CI before the first real commit", energy: "deep", optional: false },
      { title: "Set formatting and lint so nobody argues later", energy: "shallow", optional: false },
      { title: "Write the first test, even a trivial one", energy: "deep", optional: true },
    ],
  },
  {
    id: "read",
    name: "Read something properly",
    color: "yellow",
    mode: "SEQUENCE",
    runsCount: 39,
    medianDuration: "52m",
    keptPercent: 64,
    defaultVars: { item: "the Postgres index piece" },
    steps: [
      { title: "Skim {{item}} for the shape", energy: "shallow", optional: false },
      { title: "Read it once without stopping", energy: "deep", optional: false },
      { title: "Write one claim into TIL", energy: "shallow", optional: false },
    ],
  },
];

/**
 * Extracts all {{variable}} keys found in a string.
 */
export function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{(\w+)\}\}/g) || [];
  const keys: string[] = [];
  for (const m of matches) {
    const k = m.slice(2, -2);
    if (!keys.includes(k)) {
      keys.push(k);
    }
  }
  return keys;
}

/**
 * Extracts unique variable names across an array of steps.
 */
export function extractAllVariables(steps: { title: string }[]): string[] {
  const keys: string[] = [];
  for (const s of steps) {
    const vars = extractVariables(s.title || "");
    for (const v of vars) {
      if (!keys.includes(v)) {
        keys.push(v);
      }
    }
  }
  return keys;
}

/**
 * Replaces {{key}} in text with vars[key] || default fallback.
 */
export function interpolateVariables(text: string, vars: Record<string, string> = {}): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    return vars[k] !== undefined && vars[k] !== "" ? vars[k] : `{{${k}}}`;
  });
}

/**
 * Generates a random 4-character hex string for run passes (e.g. "7F2A").
 */
export function generateRunNumber(): string {
  const num = Math.floor(Math.random() * 0xffff);
  return num.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Determines whether a step node is clickable in SEQUENCE or SET mode.
 */
export function isStepLocked(
  mode: "SEQUENCE" | "SET" | string,
  stepIndex: number,
  doneList: boolean[]
): boolean {
  if (mode !== "SEQUENCE") return false;
  // In SEQUENCE mode, you can toggle an already done step, or the next immediate step.
  const nextIncomplete = doneList.indexOf(false);
  if (nextIncomplete === -1) {
    // All done
    return false;
  }
  return stepIndex > nextIncomplete;
}

export interface StepLearningStat {
  title: string;
  stepNum: number;
  energy: "deep" | "shallow" | "errand";
  optional: boolean;
  totalFinishedRuns: number;
  completedRuns: number;
  percent: number;
  badge: string;
  isBad: boolean;
}

/**
 * Computes habit learning stats for a playbook based on finished runs.
 */
export function computeStepLearning(
  playbook: { name: string; steps: PlaybookStep[] },
  runs: { state: string; steps: PlaybookRunStep[] }[]
): StepLearningStat[] {
  const finishedRuns = runs.filter((r) => r.state === "KEPT" || r.state === "LIVE");
  const total = Math.max(finishedRuns.length, 1);

  return (playbook.steps || []).map((step, idx) => {
    let completedCount = 0;
    for (const r of finishedRuns) {
      if (r.steps && r.steps[idx] && r.steps[idx].done) {
        completedCount++;
      }
    }

    // If no real runs yet, supply realistic initial stats for the mock/starter
    if (finishedRuns.length === 0) {
      const mockPct = step.optional ? 14 : idx % 2 === 0 ? 100 : 86;
      return {
        title: interpolateVariables(step.title),
        stepNum: idx + 1,
        energy: step.energy,
        optional: step.optional,
        totalFinishedRuns: 22,
        completedRuns: Math.round((mockPct / 100) * 22),
        percent: mockPct,
        badge: mockPct >= 95 ? "22/22 · ALWAYS" : mockPct < 30 ? "3/22 · CUT IT?" : `${Math.round((mockPct / 100) * 22)}/22 · ${mockPct}%`,
        isBad: mockPct < 30,
      };
    }

    const pct = Math.round((completedCount / total) * 100);
    const isBad = pct < 30 && step.optional;
    const badge =
      pct >= 95
        ? `${completedCount}/${total} · ALWAYS`
        : isBad
        ? `${completedCount}/${total} · CUT IT?`
        : `${completedCount}/${total} · ${pct}%`;

    return {
      title: interpolateVariables(step.title),
      stepNum: idx + 1,
      energy: step.energy,
      optional: step.optional,
      totalFinishedRuns: total,
      completedRuns: completedCount,
      percent: pct,
      badge,
      isBad,
    };
  });
}
