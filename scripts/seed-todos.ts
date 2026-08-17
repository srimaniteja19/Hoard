/**
 * Seed script for the todos feature (TODOS.md Phase 1).
 *
 * Seeds 60 tasks under one synthetic, non-UTC user this script creates and
 * owns entirely — every delete/insert is scoped to SEED_USER_ID. Modelled on
 * scripts/seed-heavy.ts's safe pattern, NOT scripts/seed-til.ts's (that one
 * loops over every real user in the `users` table, which is only safe
 * because this database happens to have one account).
 *
 * 45 tasks are DONE, spread across the last 30 days (America/Los_Angeles) to
 * exercise completedOn — computed server-side from the user's IANA timezone,
 * exactly like TIL's loggedFor (src/lib/dal/shared.ts). The remaining 15 are
 * OPEN with a spread of due dates: overdue, today, this week, later, and
 * someday (null dueDate). Overdue tasks are seeded with rolloverCount = 0 —
 * per TODOS.md §4, overdue-ness is computed at read time from dueDate, and
 * rolloverCount only increments on an explicit user push, never on the
 * passage of time.
 *
 * Run: npx tsx --env-file=.env.local scripts/seed-todos.ts
 */

import { db } from "../src/db";
import { users, todos, tags, todoTags, todoSubtasks } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { getCompletedOnDate } from "../src/lib/dal/todos";
import type { TodoEnergy } from "../src/db/schema";

const SEED_USER_ID = process.env.SEED_TARGET_USER_ID || "usr_seed_todos";
const SEED_USER_EMAIL = process.env.SEED_TARGET_USER_EMAIL || "seed-todos@hoard.test";
const SEED_TIMEZONE = "America/Los_Angeles";

const TAG_NAMES = ["work", "health", "admin", "learning", "errands"];

const DONE_TITLES = [
  "Reply to client email thread",
  "Write up sprint retro notes",
  "Debug the flaky checkout test",
  "Book dentist appointment",
  "Review PR from teammate",
  "Read chapter on distributed systems",
  "Pay the internet bill",
  "Refactor the auth middleware",
  "Pick up dry cleaning",
  "Draft the Q3 planning doc",
  "Call insurance about claim",
  "Update dependency versions",
  "Walk 20 minutes at lunch",
  "Prep slides for standup demo",
  "Clean up stale feature branches",
];

const OPEN_TASKS: {
  title: string;
  energy: TodoEnergy;
  estimatedMinutes: number;
  dueOffsetDays: number | null; // null = someday
}[] = [
  { title: "File overdue expense report", energy: "ERRAND", estimatedMinutes: 15, dueOffsetDays: -7 },
  { title: "Follow up on unpaid invoice", energy: "SHALLOW", estimatedMinutes: 20, dueOffsetDays: -3 },
  { title: "Renew expired parking permit", energy: "ERRAND", estimatedMinutes: 10, dueOffsetDays: -1 },
  { title: "Finish the migration write-up", energy: "DEEP", estimatedMinutes: 60, dueOffsetDays: 0 },
  { title: "Call mom back", energy: "ERRAND", estimatedMinutes: 15, dueOffsetDays: 0 },
  { title: "Design the day-plan rail layout", energy: "DEEP", estimatedMinutes: 90, dueOffsetDays: 2 },
  { title: "Buy a birthday gift", energy: "ERRAND", estimatedMinutes: 20, dueOffsetDays: 4 },
  { title: "Review Q3 budget spreadsheet", energy: "SHALLOW", estimatedMinutes: 25, dueOffsetDays: 6 },
  { title: "Plan the offsite agenda", energy: "DEEP", estimatedMinutes: 45, dueOffsetDays: 10 },
  { title: "Renew passport", energy: "ERRAND", estimatedMinutes: 30, dueOffsetDays: 18 },
  { title: "Read 'Designing Data-Intensive Applications'", energy: "DEEP", estimatedMinutes: 50, dueOffsetDays: 25 },
  { title: "Learn to bake sourdough", energy: "SHALLOW", estimatedMinutes: 30, dueOffsetDays: null },
  { title: "Digitize old photo albums", energy: "SHALLOW", estimatedMinutes: 40, dueOffsetDays: null },
  { title: "Rewrite the personal site", energy: "DEEP", estimatedMinutes: 120, dueOffsetDays: null },
  { title: "Try that new ramen place", energy: "ERRAND", estimatedMinutes: 15, dueOffsetDays: null },
];

function energyForIndex(i: number): TodoEnergy {
  const cycle: TodoEnergy[] = ["DEEP", "SHALLOW", "ERRAND"];
  return cycle[i % cycle.length];
}

function estimatedMinutesForEnergy(energy: TodoEnergy): number {
  if (energy === "DEEP") return 45;
  if (energy === "SHALLOW") return 25;
  return 12;
}

function dateAtOffset(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
}

async function ensureSeedUser(): Promise<void> {
  const existing = await db.select().from(users).where(eq(users.id, SEED_USER_ID)).limit(1);
  if (existing.length > 0) return;

  await db.insert(users).values({
    id: SEED_USER_ID,
    name: "Seed Todos (synthetic, phase 1 testing only)",
    email: SEED_USER_EMAIL,
    emailVerified: true,
    timezone: SEED_TIMEZONE,
  });
  console.log(`Created synthetic seed user ${SEED_USER_ID} <${SEED_USER_EMAIL}> tz=${SEED_TIMEZONE}`);
}

async function wipeSeedUserData(): Promise<void> {
  // Scoped exclusively to SEED_USER_ID — never touches any other user's rows.
  // todo_subtasks and todo_tags cascade on todos delete.
  await db.delete(todos).where(eq(todos.userId, SEED_USER_ID));
  await db.delete(tags).where(eq(tags.userId, SEED_USER_ID));
}

async function seedTags(): Promise<Map<string, number>> {
  const tagMap = new Map<string, number>();
  const rows = TAG_NAMES.map((name) => ({
    userId: SEED_USER_ID,
    name,
    color: "#00F0FF",
  }));
  const inserted = await db.insert(tags).values(rows).returning({ id: tags.id, name: tags.name });
  for (const row of inserted) tagMap.set(row.name, row.id);
  return tagMap;
}

async function seedDoneTodos(tagIds: number[]): Promise<{ insertedCount: number; distinctDays: number }> {
  // 30 days, alternating 2/1 tasks per day (even offsets get 2, odd get 1) = 45 total.
  const rows: (typeof todos.$inferInsert)[] = [];
  const days = new Set<string>();
  let titleIdx = 0;

  for (let offset = 0; offset < 30; offset++) {
    const countForDay = offset % 2 === 0 ? 2 : 1;
    const targetDate = dateAtOffset(offset);
    const completedOn = getCompletedOnDate(SEED_TIMEZONE, targetDate);
    days.add(completedOn);

    for (let j = 0; j < countForDay; j++) {
      const energy = energyForIndex(titleIdx);
      const estimatedMinutes = estimatedMinutesForEnergy(energy);
      // Every 5th completed task leaves actualMinutes null (dismissed prompt) —
      // excluded from calibration per TODOS.md §6.
      const actualMinutes =
        titleIdx % 5 === 0 ? null : Math.round(estimatedMinutes * (0.7 + (titleIdx % 4) * 0.2));

      rows.push({
        userId: SEED_USER_ID,
        title: DONE_TITLES[titleIdx % DONE_TITLES.length],
        energy,
        estimatedMinutes,
        actualMinutes,
        dueDate: completedOn,
        originalDueDate: completedOn,
        rolloverCount: 0,
        state: "DONE",
        completedAt: targetDate,
        completedOn,
        createdAt: targetDate,
        updatedAt: targetDate,
      });
      titleIdx++;
    }
  }

  const inserted = await db.insert(todos).values(rows).returning({ id: todos.id });

  // Attach one tag per inserted todo, cycling through the seed tags.
  const tagRows = inserted.map((row, i) => ({
    todoId: row.id,
    tagId: tagIds[i % tagIds.length],
  }));
  await db.insert(todoTags).values(tagRows);

  return { insertedCount: inserted.length, distinctDays: days.size };
}

async function seedOpenTodos(tagIds: number[]): Promise<string[]> {
  const now = new Date();
  const insertedIds: string[] = [];

  for (let i = 0; i < OPEN_TASKS.length; i++) {
    const task = OPEN_TASKS[i];
    const dueDate =
      task.dueOffsetDays === null ? null : getCompletedOnDate(SEED_TIMEZONE, dateAtOffset(-task.dueOffsetDays));

    const [row] = await db
      .insert(todos)
      .values({
        userId: SEED_USER_ID,
        title: task.title,
        energy: task.energy,
        estimatedMinutes: task.estimatedMinutes,
        dueDate,
        originalDueDate: dueDate,
        rolloverCount: 0, // overdue-ness is computed at read time, never backfilled — TODOS.md §4
        state: "OPEN",
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: todos.id });

    insertedIds.push(row.id);
    await db.insert(todoTags).values({ todoId: row.id, tagId: tagIds[i % tagIds.length] });
  }

  // A handful of subtasks on the "this week" tasks, for realism.
  const withSubtasks = insertedIds.slice(5, 9); // the four "this week"/"later" tasks
  for (const todoId of withSubtasks) {
    await db.insert(todoSubtasks).values([
      { todoId, title: "Outline the approach", done: true, position: 0 },
      { todoId, title: "Get feedback from the team", done: false, position: 1 },
    ]);
  }

  return insertedIds;
}

async function seedTodoData() {
  console.log("🌱 Seeding todos Phase 1 data...");

  await ensureSeedUser();
  await wipeSeedUserData();

  const tagMap = await seedTags();
  const tagIds = Array.from(tagMap.values());

  const { insertedCount: doneCount, distinctDays } = await seedDoneTodos(tagIds);
  const openIds = await seedOpenTodos(tagIds);

  console.log(`✓ Seeded ${doneCount} DONE tasks across ${distinctDays} distinct days`);
  console.log(`✓ Seeded ${openIds.length} OPEN tasks (overdue/today/this week/later/someday)`);
  console.log(`✓ Total tasks: ${doneCount + openIds.length}`);

  // Verification: grouped count by completedOn, exactly the query the
  // history calendar (§8) will run — one grouped query, not per-cell.
  const rows = await db
    .select({ userId: todos.userId, completedOn: todos.completedOn, state: todos.state, dueDate: todos.dueDate })
    .from(todos)
    .where(eq(todos.userId, SEED_USER_ID));

  const doneRows = rows.filter((r) => r.state === "DONE");
  const byDay = new Map<string, number>();
  for (const r of doneRows) {
    if (!r.completedOn) continue;
    byDay.set(r.completedOn, (byDay.get(r.completedOn) || 0) + 1);
  }

  console.log(`\n📊 Verification (${SEED_TIMEZONE}):`);
  console.log(`- Distinct completedOn days: ${byDay.size} (expected: 30)`);
  console.log(`- Total DONE tasks: ${doneRows.length} (expected: 45)`);
  console.log(`- Total OPEN tasks: ${rows.length - doneRows.length} (expected: 15)`);
  console.log(
    `- Someday (OPEN, dueDate null): ${rows.filter((r) => r.state === "OPEN" && r.dueDate === null).length} (expected: 4)`
  );

  if (byDay.size === 30 && doneRows.length === 45 && rows.length === 60) {
    console.log("\n✅ PHASE 1 VERIFICATION SUCCESSFUL!");
  } else {
    console.error("\n❌ PHASE 1 VERIFICATION FAILED: counts mismatch");
    process.exit(1);
  }
}

if (require.main === module) {
  seedTodoData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seed script failed:", err);
      process.exit(1);
    });
}

export { seedTodoData, SEED_USER_ID, SEED_TIMEZONE };
