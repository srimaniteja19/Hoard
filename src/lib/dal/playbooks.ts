import { db } from "@/db";
import {
  playbooks,
  playbookRuns,
  PlaybookRow,
  NewPlaybookRow,
  PlaybookRunRow,
  NewPlaybookRunRow,
  PlaybookStep,
  PlaybookRunStep,
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { STARTER_PLAYBOOKS, generateRunNumber, interpolateVariables } from "@/lib/todos/playbooks";

/**
 * List all active (unarchived) playbooks for a user.
 * If user has no playbooks, auto-seed the default starter plays!
 */
export async function listPlaybooks(userId: string): Promise<PlaybookRow[]> {
  const existing = await db
    .select()
    .from(playbooks)
    .where(and(eq(playbooks.userId, userId), eq(playbooks.isArchived, false)))
    .orderBy(desc(playbooks.runsCount), desc(playbooks.createdAt));

  if (existing.length > 0) {
    return existing;
  }

  // Seed default starter playbooks
  const seededRows: NewPlaybookRow[] = STARTER_PLAYBOOKS.map((sp) => ({
    userId,
    name: sp.name,
    color: sp.color,
    mode: sp.mode,
    steps: sp.steps,
    defaultVars: sp.defaultVars,
    runsCount: sp.runsCount,
    medianDuration: sp.medianDuration,
    keptPercent: sp.keptPercent,
    isArchived: false,
  }));

  const inserted = await db.insert(playbooks).values(seededRows).returning();

  // Also seed initial starter runs in ledger if empty
  if (inserted.length > 0) {
    const shipPlay = inserted.find((p) => p.name === "Ship a branch") || inserted[0];
    const reviewPlay = inserted.find((p) => p.name === "Review a PR") || inserted[1] || inserted[0];

    const initialRuns: NewPlaybookRunRow[] = [
      {
        userId,
        playbookId: shipPlay.id,
        runNumber: "7F2A",
        title: "Ship a branch · auth-migration",
        mode: shipPlay.mode,
        color: shipPlay.color,
        vars: { branch: "auth-migration", ticket: "RIV-412" },
        steps: (shipPlay.steps as PlaybookStep[]).map((s, idx) => ({
          title: interpolateVariables(s.title, { branch: "auth-migration", ticket: "RIV-412" }),
          energy: s.energy,
          optional: s.optional,
          done: idx < 2,
        })),
        state: "LIVE",
        duration: "2h 04m",
      },
      {
        userId,
        playbookId: reviewPlay.id,
        runNumber: "9C11",
        title: "Review a PR · #318",
        mode: reviewPlay.mode,
        color: reviewPlay.color,
        vars: { pr: "#318", author: "Sam" },
        steps: (reviewPlay.steps as PlaybookStep[]).map((s, idx) => ({
          title: interpolateVariables(s.title, { pr: "#318", author: "Sam" }),
          energy: s.energy,
          optional: s.optional,
          done: idx < 1,
        })),
        state: "LIVE",
        duration: "—",
      },
      {
        userId,
        playbookId: reviewPlay.id,
        runNumber: "6B83",
        title: "Review a PR · #312",
        mode: reviewPlay.mode,
        color: reviewPlay.color,
        vars: { pr: "#312", author: "Alex" },
        steps: (reviewPlay.steps as PlaybookStep[]).map((s) => ({
          title: s.title,
          energy: s.energy,
          optional: s.optional,
          done: true,
        })),
        state: "KEPT",
        duration: "31m",
      },
      {
        userId,
        playbookId: null,
        runNumber: "4A19",
        title: "Close the week",
        mode: "SET",
        color: "lime",
        vars: {},
        steps: [
          { title: "Clear the unsorted pile", energy: "shallow", optional: false, done: true },
          { title: "Tend anything fading in TIL", energy: "errand", optional: false, done: true },
          { title: "Walk one Atlas station", energy: "deep", optional: false, done: true },
          { title: "Act on one line from the Gazette", energy: "shallow", optional: true, done: true },
        ],
        state: "KEPT",
        duration: "26m",
      },
      {
        userId,
        playbookId: shipPlay.id,
        runNumber: "3D77",
        title: "Ship a branch · query-speed",
        mode: "SEQUENCE",
        color: "violet",
        vars: { branch: "query-speed", ticket: "HOA-88" },
        steps: (shipPlay.steps as PlaybookStep[]).map((s, idx) => ({
          title: s.title,
          energy: s.energy,
          optional: s.optional,
          done: idx < 5,
        })),
        state: "KEPT",
        duration: "2h 41m",
      },
      {
        userId,
        playbookId: null,
        runNumber: "2E05",
        title: "Read something properly",
        mode: "SEQUENCE",
        color: "yellow",
        vars: {},
        steps: [
          { title: "Skim for shape", energy: "shallow", optional: false, done: true },
          { title: "Read it once", energy: "deep", optional: false, done: false },
          { title: "Write to TIL", energy: "shallow", optional: false, done: false },
        ],
        state: "ABANDONED",
        duration: "—",
      },
    ];
    await db.insert(playbookRuns).values(initialRuns).catch(() => {});
  }

  return inserted;
}

/**
 * Get single playbook by ID.
 */
export async function getPlaybookById(userId: string, id: string): Promise<PlaybookRow | null> {
  const [row] = await db
    .select()
    .from(playbooks)
    .where(and(eq(playbooks.id, id), eq(playbooks.userId, userId)));
  return row || null;
}

/**
 * Create a new playbook.
 */
export async function createPlaybook(
  userId: string,
  input: {
    name: string;
    color?: string;
    mode?: "SEQUENCE" | "SET" | string;
    steps: PlaybookStep[];
    defaultVars?: Record<string, string>;
  }
): Promise<PlaybookRow> {
  const [row] = await db
    .insert(playbooks)
    .values({
      userId,
      name: input.name,
      color: input.color || "violet",
      mode: input.mode || "SEQUENCE",
      steps: input.steps || [],
      defaultVars: input.defaultVars || {},
      runsCount: 0,
      medianDuration: "25m",
      keptPercent: 80,
      isArchived: false,
    })
    .returning();
  return row;
}

/**
 * Update an existing playbook.
 */
export async function updatePlaybook(
  userId: string,
  id: string,
  patch: Partial<NewPlaybookRow>
): Promise<PlaybookRow | null> {
  const [updated] = await db
    .update(playbooks)
    .set({
      ...patch,
      updatedAt: new Date(),
    })
    .where(and(eq(playbooks.id, id), eq(playbooks.userId, userId)))
    .returning();
  return updated || null;
}

/**
 * Archive a playbook.
 */
export async function archivePlaybook(userId: string, id: string): Promise<boolean> {
  const [updated] = await db
    .update(playbooks)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(and(eq(playbooks.id, id), eq(playbooks.userId, userId)))
    .returning();
  return !!updated;
}

/**
 * Duplicate a playbook.
 */
export async function duplicatePlaybook(userId: string, id: string): Promise<PlaybookRow | null> {
  const orig = await getPlaybookById(userId, id);
  if (!orig) return null;

  const [row] = await db
    .insert(playbooks)
    .values({
      userId,
      name: `${orig.name} (Copy)`,
      color: orig.color,
      mode: orig.mode,
      steps: orig.steps,
      defaultVars: orig.defaultVars,
      runsCount: 0,
      medianDuration: orig.medianDuration,
      keptPercent: orig.keptPercent,
      isArchived: false,
    })
    .returning();
  return row;
}

/**
 * List all runs for a user (both LIVE in-flight passes and ledger history).
 */
export async function listPlaybookRuns(userId: string): Promise<PlaybookRunRow[]> {
  return await db
    .select()
    .from(playbookRuns)
    .where(eq(playbookRuns.userId, userId))
    .orderBy(desc(playbookRuns.startedAt));
}

/**
 * Issue a new run pass from a playbook template.
 */
export async function issuePlaybookRun(
  userId: string,
  playbookId: string,
  customVars: Record<string, string> = {}
): Promise<PlaybookRunRow> {
  const playbook = await getPlaybookById(userId, playbookId);
  if (!playbook) {
    throw new Error(`Playbook not found: ${playbookId}`);
  }

  const mergedVars = { ...playbook.defaultVars, ...customVars };
  const runSteps: PlaybookRunStep[] = (playbook.steps || []).map((s) => ({
    title: interpolateVariables(s.title, mergedVars),
    energy: s.energy,
    optional: s.optional,
    done: false,
  }));

  const runNo = generateRunNumber();
  const primaryVar = Object.values(mergedVars)[0];
  const title = primaryVar ? `${playbook.name} · ${primaryVar}` : playbook.name;

  const [run] = await db
    .insert(playbookRuns)
    .values({
      userId,
      playbookId: playbook.id,
      runNumber: runNo,
      title,
      mode: playbook.mode,
      color: playbook.color,
      vars: mergedVars,
      steps: runSteps,
      state: "LIVE",
      startedAt: new Date(),
    })
    .returning();

  // Increment runs count on playbook
  await db
    .update(playbooks)
    .set({
      runsCount: sql`${playbooks.runsCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(playbooks.id, playbook.id));

  return run;
}

/**
 * Toggle or update step status on an issued run pass.
 */
export async function togglePlaybookRunStep(
  userId: string,
  runId: string,
  stepIndex: number
): Promise<PlaybookRunRow | null> {
  const [run] = await db
    .select()
    .from(playbookRuns)
    .where(and(eq(playbookRuns.id, runId), eq(playbookRuns.userId, userId)));

  if (!run) return null;

  const updatedSteps = [...(run.steps || [])];
  if (!updatedSteps[stepIndex]) return run;

  const nextDone = !updatedSteps[stepIndex].done;
  updatedSteps[stepIndex] = {
    ...updatedSteps[stepIndex],
    done: nextDone,
    completedAt: nextDone ? new Date().toISOString() : undefined,
  };

  // If in SEQUENCE mode and unchecking a step, uncheck all subsequent steps
  if (run.mode === "SEQUENCE" && !nextDone) {
    for (let i = stepIndex + 1; i < updatedSteps.length; i++) {
      updatedSteps[i] = {
        ...updatedSteps[i],
        done: false,
        completedAt: undefined,
      };
    }
  }

  const [updated] = await db
    .update(playbookRuns)
    .set({
      steps: updatedSteps,
      updatedAt: new Date(),
    })
    .where(eq(playbookRuns.id, runId))
    .returning();

  return updated || null;
}

/**
 * Advance the next incomplete step on an issued run pass.
 */
export async function advancePlaybookRun(
  userId: string,
  runId: string
): Promise<PlaybookRunRow | null> {
  const [run] = await db
    .select()
    .from(playbookRuns)
    .where(and(eq(playbookRuns.id, runId), eq(playbookRuns.userId, userId)));

  if (!run) return null;

  const steps = [...(run.steps || [])];
  const nextIncomplete = steps.findIndex((s) => !s.done);

  if (nextIncomplete > -1) {
    steps[nextIncomplete] = {
      ...steps[nextIncomplete],
      done: true,
      completedAt: new Date().toISOString(),
    };

    const allDone = steps.every((s) => s.done);
    const [updated] = await db
      .update(playbookRuns)
      .set({
        steps,
        state: allDone ? "KEPT" : run.state,
        completedAt: allDone ? new Date() : run.completedAt,
        updatedAt: new Date(),
      })
      .where(eq(playbookRuns.id, runId))
      .returning();

    return updated || null;
  } else {
    // Already all done, mark closed
    const [updated] = await db
      .update(playbookRuns)
      .set({
        state: "KEPT",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(playbookRuns.id, runId))
      .returning();

    return updated || null;
  }
}

/**
 * Close a run pass as KEPT.
 */
export async function closePlaybookRun(
  userId: string,
  runId: string
): Promise<PlaybookRunRow | null> {
  const [updated] = await db
    .update(playbookRuns)
    .set({
      state: "KEPT",
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(playbookRuns.id, runId), eq(playbookRuns.userId, userId)))
    .returning();
  return updated || null;
}

/**
 * Abandon a run pass.
 */
export async function abandonPlaybookRun(
  userId: string,
  runId: string
): Promise<PlaybookRunRow | null> {
  const [updated] = await db
    .update(playbookRuns)
    .set({
      state: "ABANDONED",
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(playbookRuns.id, runId), eq(playbookRuns.userId, userId)))
    .returning();
  return updated || null;
}
