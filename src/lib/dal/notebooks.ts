import { db } from "@/db";
import {
  notebookCourses,
  notebookModules,
  notebookLessons,
  notebookPages,
  notebookTranscripts,
  notebookCollisions,
  NotebookCourseRow,
  NotebookModuleRow,
  NewNotebookModuleRow,
  NotebookLessonRow,
  NotebookPageRow,
  NotebookTranscriptRow,
  NotebookCollisionRow,
} from "@/db/schema";
import { eq, and, or, like, asc, desc, inArray, ne } from "drizzle-orm";
import { Block, computeWordCount, generateBlockId } from "@/lib/notebooks/blocks";
import {
  SEED_COURSES,
  SEED_COLLISIONS,
  SeedCourse,
  SeedCourseModule,
  SeedCourseLesson,
  CourseCollision,
} from "@/lib/notebooks/seedData";
import crypto from "crypto";

/**
 * Scopes an ID to the user to prevent multi-tenant PK collisions on static seed IDs.
 */
function toScopedId(userId: string, rawId: string | undefined): string {
  if (!rawId) return crypto.randomUUID();
  if (rawId.startsWith(userId + "_")) return rawId;
  return `${userId}_${rawId}`;
}

function lessonIdFilter(userId: string, lessonId: string) {
  return or(
    eq(notebookLessons.id, lessonId),
    eq(notebookLessons.id, `${userId}_${lessonId}`),
    like(notebookLessons.id, `%_${lessonId}`)
  );
}

function moduleIdFilter(userId: string, moduleId: string) {
  return or(
    eq(notebookModules.id, moduleId),
    eq(notebookModules.id, `${userId}_${moduleId}`),
    like(notebookModules.id, `%_${moduleId}`)
  );
}

function courseIdFilter(userId: string, courseId: string) {
  return or(
    eq(notebookCourses.id, courseId),
    eq(notebookCourses.id, `${userId}_${courseId}`),
    like(notebookCourses.id, `%_${courseId}`)
  );
}

/**
 * Derives a human-readable metadata string from word count & blocks
 */
function formatLessonMeta(wordCount: number, hasGap: boolean): string {
  if (hasGap) return `${wordCount.toLocaleString()} WORDS · STUB ADDED`;
  if (wordCount === 0) return "NO NOTES YET";
  if (wordCount < 120) return `${wordCount} WORDS · STUB`;
  return `${wordCount.toLocaleString()} WORDS`;
}

/**
 * Fetches all courses for a user, fully structured with modules, lessons, and pages.
 */
export async function getUserNotebookCourses(userId: string): Promise<SeedCourse[]> {
  // 1. Fetch user courses
  const courseRows = await db
    .select()
    .from(notebookCourses)
    .where(eq(notebookCourses.userId, userId))
    .orderBy(asc(notebookCourses.createdAt));

  if (courseRows.length === 0) {
    return [];
  }

  const courseIds = courseRows.map((c) => c.id);

  // 2. Fetch all modules
  const moduleRows = await db
    .select()
    .from(notebookModules)
    .where(inArray(notebookModules.courseId, courseIds))
    .orderBy(asc(notebookModules.position), asc(notebookModules.createdAt));

  const moduleIds = moduleRows.map((m) => m.id);

  // 3. Fetch all lessons (if any modules exist)
  let lessonRows: NotebookLessonRow[] = [];
  if (moduleIds.length > 0) {
    lessonRows = await db
      .select()
      .from(notebookLessons)
      .where(inArray(notebookLessons.moduleId, moduleIds))
      .orderBy(asc(notebookLessons.position), asc(notebookLessons.createdAt));
  }

  const lessonIds = lessonRows.map((l) => l.id);

  // 4. Fetch all pages & transcripts
  let pageRows: NotebookPageRow[] = [];
  let transcriptRows: NotebookTranscriptRow[] = [];

  if (lessonIds.length > 0) {
    [pageRows, transcriptRows] = await Promise.all([
      db
        .select()
        .from(notebookPages)
        .where(inArray(notebookPages.lessonId, lessonIds)),
      db
        .select()
        .from(notebookTranscripts)
        .where(inArray(notebookTranscripts.lessonId, lessonIds)),
    ]);
  }

  const pageByLessonId = new Map<string, NotebookPageRow>();
  for (const p of pageRows) {
    pageByLessonId.set(p.lessonId, p);
  }

  const transcriptByLessonId = new Map<string, NotebookTranscriptRow>();
  for (const t of transcriptRows) {
    transcriptByLessonId.set(t.lessonId, t);
  }

  const lessonsByModuleId = new Map<string, SeedCourseLesson[]>();
  for (const l of lessonRows) {
    const page = pageByLessonId.get(l.id);
    const transcript = transcriptByLessonId.get(l.id);
    const blocks: Block[] = (page?.blocks as Block[]) || [];
    const wordCount = page?.wordCount ?? computeWordCount(blocks);
    const gap = (l.gap as { timestamp: string; topic: string }[]) || undefined;

    const lessonObj: SeedCourseLesson = {
      id: l.id,
      title: l.title,
      watched: Boolean(l.watchedAt),
      lessonUrl: l.lessonUrl || undefined,
      coverUrl: l.coverUrl || undefined,
      icon: l.icon || undefined,
      meta: formatLessonMeta(wordCount, Boolean(gap && gap.length > 0)),
      blocks,
      blocksUpdatedAt: page?.updatedAt?.toISOString(),
      gap,
      transcript: transcript
        ? {
            text: transcript.text,
            cues: transcript.cues || [],
          }
        : undefined,
    };

    const existing = lessonsByModuleId.get(l.moduleId) || [];
    existing.push(lessonObj);
    lessonsByModuleId.set(l.moduleId, existing);
  }

  const modulesByCourseId = new Map<string, SeedCourseModule[]>();
  for (const m of moduleRows) {
    const modObj: SeedCourseModule = {
      id: m.id,
      title: m.title,
      lessons: lessonsByModuleId.get(m.id) || [],
    };
    const existing = modulesByCourseId.get(m.courseId) || [];
    existing.push(modObj);
    modulesByCourseId.set(m.courseId, existing);
  }

  return courseRows.map((c) => ({
    id: c.id,
    title: c.title,
    provider: c.provider,
    accent: c.accent,
    accentFg: c.accentFg,
    init: c.init || c.title.trim().charAt(0).toUpperCase() || "C",
    startedAt: c.startedAt.toISOString(),
    modules: modulesByCourseId.get(c.id) || [],
  }));
}

/**
 * Bulk writes/imports a complete courses array to PostgreSQL for the user.
 */
export async function syncLocalCoursesToDb(
  userId: string,
  courses: SeedCourse[],
  collisions?: CourseCollision[],
  options: { allowShrink?: boolean } = {}
): Promise<SeedCourse[]> {
  if (!courses || courses.length === 0) return [];

  // Safety net: this performs a full delete-and-reinsert of the user's
  // entire course library from a client-supplied snapshot. A stale or
  // partial snapshot (e.g. a tab whose local state hasn't fully loaded, or
  // a bug in whatever calls this) would otherwise silently wipe courses
  // that simply weren't present in the array. Refuse to shrink the library
  // unless the caller explicitly opts in.
  if (!options.allowShrink) {
    const existing = await db
      .select({ id: notebookCourses.id })
      .from(notebookCourses)
      .where(eq(notebookCourses.userId, userId));
    if (existing.length > 0 && courses.length < existing.length) {
      throw new Error(
        `syncLocalCoursesToDb refused to replace ${existing.length} existing course(s) with only ${courses.length} — pass { allowShrink: true } if this is intentional.`
      );
    }
  }

  // Delete existing courses & collisions for this user to perform a clean sync
  await db.delete(notebookCourses).where(eq(notebookCourses.userId, userId));

  for (let cIdx = 0; cIdx < courses.length; cIdx++) {
    const c = courses[cIdx];
    const courseId = toScopedId(userId, c.id);

    await db.insert(notebookCourses).values({
      id: courseId,
      userId,
      title: c.title,
      provider: c.provider || "DEEPLEARNING.AI",
      accent: c.accent || "#7B5CF0",
      accentFg: c.accentFg || "#FFFFFF",
      init: c.init || c.title.trim().charAt(0).toUpperCase() || "C",
      startedAt: c.startedAt ? new Date(c.startedAt) : new Date(),
      createdAt: new Date(Date.now() + cIdx * 10),
    });

    for (let mIdx = 0; mIdx < (c.modules || []).length; mIdx++) {
      const m = c.modules[mIdx];
      const moduleId = toScopedId(userId, m.id);

      await db.insert(notebookModules).values({
        id: moduleId,
        courseId,
        title: m.title,
        position: mIdx,
      });

      for (let lIdx = 0; lIdx < (m.lessons || []).length; lIdx++) {
        const l = m.lessons[lIdx];
        const lessonId = toScopedId(userId, l.id);
        const blocks = l.blocks || [];
        const wordCount = computeWordCount(blocks);

        await db.insert(notebookLessons).values({
          id: lessonId,
          moduleId,
          title: l.title,
          position: lIdx,
          watchedAt: l.watched ? new Date() : null,
          lessonUrl: l.lessonUrl || null,
          coverUrl: l.coverUrl || null,
          icon: l.icon || null,
          gap: l.gap || [],
        });

        await db.insert(notebookPages).values({
          id: crypto.randomUUID(),
          lessonId,
          blocks: blocks,
          wordCount,
          updatedAt: new Date(),
        });

        if (l.transcript) {
          await db.insert(notebookTranscripts).values({
            id: crypto.randomUUID(),
            lessonId,
            text: l.transcript.text,
            cues: l.transcript.cues || [],
            source: "pasted",
          });
        }
      }
    }
  }

  if (collisions && collisions.length > 0) {
    await saveNotebookCollisions(userId, collisions);
  }

  return await getUserNotebookCourses(userId);
}

/**
 * Returns user courses and collisions.
 */
export async function getOrSeedUserNotebookCourses(userId: string): Promise<{
  courses: SeedCourse[];
  collisions: CourseCollision[];
}> {
  const courses = await getUserNotebookCourses(userId);
  const collisions = await getNotebookCollisions(userId);
  return { courses, collisions };
}

/**
 * Creates a brand new course with a default first module and starter page.
 */
export async function createCourse(
  userId: string,
  data: {
    title: string;
    provider?: string;
    accent?: string;
    accentFg?: string;
    init?: string;
    url?: string;
  }
): Promise<SeedCourse> {
  const courseId = crypto.randomUUID();
  const title = data.title.trim();
  const init = data.init || title.charAt(0).toUpperCase() || "C";
  const moduleId = crypto.randomUUID();
  const lessonId = crypto.randomUUID();
  const initialBlocks: Block[] = [
    {
      id: generateBlockId(),
      type: "paragraph",
      text: "Overview of learning outcomes, prerequisites, and development setup.",
    },
  ];

  // These four inserts form one dependency chain (course -> module -> lesson
  // -> page); a failure partway through would orphan a row with no working
  // parent. db.batch() sends them as a single atomic request — Neon's HTTP
  // driver supports batched transactions even though it doesn't support
  // interactive db.transaction() over HTTP.
  await db.batch([
    db.insert(notebookCourses).values({
      id: courseId,
      userId,
      title,
      provider: (data.provider || "DEEPLEARNING.AI").trim().toUpperCase(),
      accent: data.accent || "#7B5CF0",
      accentFg: data.accentFg || "#FFFFFF",
      init,
      url: data.url || null,
      startedAt: new Date(),
    }),
    db.insert(notebookModules).values({
      id: moduleId,
      courseId,
      title: "MODULE 1 · GETTING STARTED",
      position: 0,
    }),
    db.insert(notebookLessons).values({
      id: lessonId,
      moduleId,
      title: "Course Overview and Syllabus",
      position: 0,
      watchedAt: new Date(),
      gap: [],
    }),
    db.insert(notebookPages).values({
      id: crypto.randomUUID(),
      lessonId,
      blocks: initialBlocks,
      wordCount: computeWordCount(initialBlocks),
      updatedAt: new Date(),
    }),
  ]);

  const matched = (await getUserNotebookCourses(userId)).find((c) => c.id === courseId);
  return (
    matched || {
      id: courseId,
      title,
      provider: data.provider || "DEEPLEARNING.AI",
      accent: data.accent || "#7B5CF0",
      accentFg: data.accentFg || "#FFFFFF",
      init,
      startedAt: new Date().toISOString(),
      modules: [
        {
          id: moduleId,
          title: "MODULE 1 · GETTING STARTED",
          lessons: [
            {
              id: lessonId,
              title: "Course Overview and Syllabus",
              watched: true,
              meta: "STUB · 1 LINE",
              blocks: initialBlocks,
            },
          ],
        },
      ],
    }
  );
}

/**
 * Updates course metadata (title, provider, accents, etc.)
 */
export async function updateCourse(
  userId: string,
  courseId: string,
  data: Partial<{
    title: string;
    provider: string;
    accent: string;
    accentFg: string;
    init: string;
    url: string;
  }>
): Promise<boolean> {
  const updateData: any = {};
  if (data.title !== undefined) {
    updateData.title = data.title.trim();
    if (!data.init) updateData.init = data.title.trim().charAt(0).toUpperCase() || "C";
  }
  if (data.provider !== undefined) updateData.provider = data.provider.trim().toUpperCase();
  if (data.accent !== undefined) updateData.accent = data.accent;
  if (data.accentFg !== undefined) updateData.accentFg = data.accentFg;
  if (data.init !== undefined) updateData.init = data.init;
  if (data.url !== undefined) updateData.url = data.url;

  const res = await db
    .update(notebookCourses)
    .set(updateData)
    .where(
      and(
        courseIdFilter(userId, courseId),
        eq(notebookCourses.userId, userId)
      )
    )
    .returning({ id: notebookCourses.id });

  return res.length > 0;
}

/**
 * Deletes a course (cascades all modules, lessons, pages).
 */
/**
 * Deletes a course (cascades all modules, lessons, pages).
 */
export async function deleteCourse(userId: string, courseId: string): Promise<boolean> {
  const res = await db
    .delete(notebookCourses)
    .where(
      and(
        courseIdFilter(userId, courseId),
        eq(notebookCourses.userId, userId)
      )
    )
    .returning({ id: notebookCourses.id });

  return res.length > 0;
}

/**
 * Creates a new module inside a course.
 */
export async function createModule(
  userId: string,
  courseId: string,
  title: string,
  targetPosition?: number
): Promise<SeedCourseModule | null> {
  const [course] = await db
    .select({ id: notebookCourses.id })
    .from(notebookCourses)
    .where(
      and(
        courseIdFilter(userId, courseId),
        eq(notebookCourses.userId, userId)
      )
    )
    .limit(1);

  if (!course) return null;

  const existingModules = await db
    .select({ id: notebookModules.id, position: notebookModules.position })
    .from(notebookModules)
    .where(eq(notebookModules.courseId, course.id))
    .orderBy(asc(notebookModules.position));

  let position = existingModules.length;
  if (typeof targetPosition === "number" && targetPosition >= 0 && targetPosition <= existingModules.length) {
    position = targetPosition;
    for (const m of existingModules) {
      if (m.position >= position) {
        await db
          .update(notebookModules)
          .set({ position: m.position + 1 })
          .where(eq(notebookModules.id, m.id));
      }
    }
  }

  const moduleId = crypto.randomUUID();
  await db.insert(notebookModules).values({
    id: moduleId,
    courseId: course.id,
    title: title.trim(),
    position,
  });

  return {
    id: moduleId,
    title: title.trim(),
    lessons: [],
  };
}

/**
 * Updates a module (rename / reorder).
 */
export async function updateModule(
  userId: string,
  moduleId: string,
  updates: { title?: string; position?: number }
): Promise<boolean> {
  const [mod] = await db
    .select({ id: notebookModules.id })
    .from(notebookModules)
    .innerJoin(notebookCourses, eq(notebookModules.courseId, notebookCourses.id))
    .where(
      and(
        moduleIdFilter(userId, moduleId),
        eq(notebookCourses.userId, userId)
      )
    )
    .limit(1);

  if (!mod) return false;

  const patch: Partial<NewNotebookModuleRow> = {};
  if (typeof updates.title === "string" && updates.title.trim()) {
    patch.title = updates.title.trim();
  }
  if (typeof updates.position === "number") {
    patch.position = updates.position;
  }

  if (Object.keys(patch).length === 0) return true;

  const res = await db
    .update(notebookModules)
    .set(patch)
    .where(eq(notebookModules.id, mod.id))
    .returning({ id: notebookModules.id });

  return res.length > 0;
}

/**
 * Deletes a module and cascades all its lessons and pages.
 */
export async function deleteModule(userId: string, moduleId: string): Promise<boolean> {
  const [mod] = await db
    .select({ id: notebookModules.id, courseId: notebookModules.courseId })
    .from(notebookModules)
    .innerJoin(notebookCourses, eq(notebookModules.courseId, notebookCourses.id))
    .where(
      and(
        moduleIdFilter(userId, moduleId),
        eq(notebookCourses.userId, userId)
      )
    )
    .limit(1);

  if (!mod) return false;

  // Re-index remaining modules for clean sequence
  const remaining = await db
    .select({ id: notebookModules.id })
    .from(notebookModules)
    .where(and(eq(notebookModules.courseId, mod.courseId), ne(notebookModules.id, mod.id)))
    .orderBy(asc(notebookModules.position), asc(notebookModules.createdAt));

  // Delete + re-index as one atomic batch, so a failure partway through
  // can't leave the remaining modules with gapped/inconsistent positions.
  const [res] = await db.batch([
    db.delete(notebookModules).where(eq(notebookModules.id, mod.id)).returning({ id: notebookModules.id }),
    ...remaining.map((m, i) =>
      db.update(notebookModules).set({ position: i }).where(eq(notebookModules.id, m.id))
    ),
  ]);

  return res.length > 0;
}

/**
 * Creates a new lesson / page inside a module.
 */
export async function createLesson(
  userId: string,
  moduleId: string,
  title: string,
  blocks?: Block[],
  targetPosition?: number
): Promise<SeedCourseLesson | null> {
  // Verify user owns the parent course of this module
  const [mod] = await db
    .select({ moduleId: notebookModules.id, courseId: notebookModules.courseId })
    .from(notebookModules)
    .innerJoin(notebookCourses, eq(notebookModules.courseId, notebookCourses.id))
    .where(
      and(
        moduleIdFilter(userId, moduleId),
        eq(notebookCourses.userId, userId)
      )
    )
    .limit(1);

  if (!mod) return null;

  // Count existing lessons to determine position
  const existing = await db
    .select({ id: notebookLessons.id, position: notebookLessons.position })
    .from(notebookLessons)
    .where(eq(notebookLessons.moduleId, mod.moduleId))
    .orderBy(asc(notebookLessons.position));

  let position = existing.length;
  if (typeof targetPosition === "number" && targetPosition >= 0 && targetPosition <= existing.length) {
    position = targetPosition;
    for (const l of existing) {
      if (l.position >= position) {
        await db
          .update(notebookLessons)
          .set({ position: l.position + 1 })
          .where(eq(notebookLessons.id, l.id));
      }
    }
  }

  const lessonId = crypto.randomUUID();
  const initialBlocks = blocks || [{ id: generateBlockId(), type: "paragraph", text: "" }];
  const wordCount = computeWordCount(initialBlocks);

  await db.insert(notebookLessons).values({
    id: lessonId,
    moduleId: mod.moduleId,
    title: title.trim(),
    position,
    watchedAt: null,
    gap: [],
  });

  await db.insert(notebookPages).values({
    id: crypto.randomUUID(),
    lessonId,
    blocks: initialBlocks,
    wordCount,
    updatedAt: new Date(),
  });

  return {
    id: lessonId,
    title: title.trim(),
    watched: false,
    meta: formatLessonMeta(wordCount, false),
    blocks: initialBlocks,
  };
}

/**
 * Saves blocks for a lesson (atomic upsert into notebookPages)
 */
export async function saveLessonBlocks(
  userId: string,
  lessonId: string,
  blocks: Block[],
  expectedUpdatedAt?: string | null
): Promise<{ success: boolean; wordCount: number; updatedAt?: string; conflict?: boolean }> {
  // Verify ownership
  const [les] = await db
    .select({ lessonId: notebookLessons.id })
    .from(notebookLessons)
    .innerJoin(notebookModules, eq(notebookLessons.moduleId, notebookModules.id))
    .innerJoin(notebookCourses, eq(notebookModules.courseId, notebookCourses.id))
    .where(
      and(
        lessonIdFilter(userId, lessonId),
        eq(notebookCourses.userId, userId)
      )
    )
    .limit(1);

  if (!les) return { success: false, wordCount: 0 };

  const wordCount = computeWordCount(blocks);

  // Check if page row already exists
  const [existingPage] = await db
    .select({ id: notebookPages.id, updatedAt: notebookPages.updatedAt })
    .from(notebookPages)
    .where(eq(notebookPages.lessonId, les.lessonId))
    .limit(1);

  if (existingPage) {
    // Optimistic concurrency: two debounced saves for the same lesson can
    // reach the server out of order (e.g. a slow request followed by a
    // faster one). Without this check the older edit silently overwrites
    // the newer one while the client still reports "saved". Only apply the
    // write if the caller's view of the page is still current; the UPDATE's
    // WHERE clause re-checks this atomically in case another write lands
    // between our SELECT above and this UPDATE.
    if (expectedUpdatedAt) {
      const expected = new Date(expectedUpdatedAt).getTime();
      if (Number.isNaN(expected) || expected !== existingPage.updatedAt.getTime()) {
        return {
          success: false,
          conflict: true,
          wordCount,
          updatedAt: existingPage.updatedAt.toISOString(),
        };
      }
    }

    const nextUpdatedAt = new Date();
    const updated = await db
      .update(notebookPages)
      .set({ blocks, wordCount, updatedAt: nextUpdatedAt })
      .where(
        expectedUpdatedAt
          ? and(eq(notebookPages.lessonId, les.lessonId), eq(notebookPages.updatedAt, existingPage.updatedAt))
          : eq(notebookPages.lessonId, les.lessonId)
      )
      .returning({ id: notebookPages.id });

    if (updated.length === 0) {
      // Lost the race between our SELECT and UPDATE above.
      const [fresh] = await db
        .select({ updatedAt: notebookPages.updatedAt })
        .from(notebookPages)
        .where(eq(notebookPages.lessonId, les.lessonId))
        .limit(1);
      return { success: false, conflict: true, wordCount, updatedAt: fresh?.updatedAt.toISOString() };
    }

    return { success: true, wordCount, updatedAt: nextUpdatedAt.toISOString() };
  }

  const nextUpdatedAt = new Date();
  await db.insert(notebookPages).values({
    id: crypto.randomUUID(),
    lessonId: les.lessonId,
    blocks,
    wordCount,
    updatedAt: nextUpdatedAt,
  });

  return { success: true, wordCount, updatedAt: nextUpdatedAt.toISOString() };
}

/**
 * Toggles or sets watched status of a lesson
 */
export async function toggleLessonWatched(
  userId: string,
  lessonId: string,
  watched?: boolean
): Promise<boolean> {
  const [les] = await db
    .select({ lessonId: notebookLessons.id, watchedAt: notebookLessons.watchedAt })
    .from(notebookLessons)
    .innerJoin(notebookModules, eq(notebookLessons.moduleId, notebookModules.id))
    .innerJoin(notebookCourses, eq(notebookModules.courseId, notebookCourses.id))
    .where(
      and(
        lessonIdFilter(userId, lessonId),
        eq(notebookCourses.userId, userId)
      )
    )
    .limit(1);

  if (!les) return false;

  const nextWatchedAt =
    watched !== undefined
      ? watched
        ? new Date()
        : null
      : les.watchedAt
      ? null
      : new Date();

  await db
    .update(notebookLessons)
    .set({ watchedAt: nextWatchedAt })
    .where(eq(notebookLessons.id, les.lessonId));

  return Boolean(nextWatchedAt);
}

/**
 * Updates lesson metadata (title, gap, lessonUrl)
 */
export async function updateLesson(
  userId: string,
  lessonId: string,
  data: {
    title?: string;
    gap?: { timestamp: string; topic: string }[];
    lessonUrl?: string | null;
    coverUrl?: string | null;
    icon?: string | null;
    watched?: boolean;
  }
): Promise<boolean> {
  const [les] = await db
    .select({ lessonId: notebookLessons.id })
    .from(notebookLessons)
    .innerJoin(notebookModules, eq(notebookLessons.moduleId, notebookModules.id))
    .innerJoin(notebookCourses, eq(notebookModules.courseId, notebookCourses.id))
    .where(
      and(
        lessonIdFilter(userId, lessonId),
        eq(notebookCourses.userId, userId)
      )
    )
    .limit(1);

  if (!les) return false;

  const updateFields: any = {};
  if (data.title !== undefined) updateFields.title = data.title.trim();
  if (data.gap !== undefined) updateFields.gap = data.gap;
  if (data.lessonUrl !== undefined) updateFields.lessonUrl = data.lessonUrl || null;
  if (data.coverUrl !== undefined) updateFields.coverUrl = data.coverUrl || null;
  if (data.icon !== undefined) updateFields.icon = data.icon || null;
  if (data.watched !== undefined) updateFields.watchedAt = data.watched ? new Date() : null;

  await db
    .update(notebookLessons)
    .set(updateFields)
    .where(eq(notebookLessons.id, les.lessonId));

  return true;
}

/**
 * Deletes a lesson / page
 */
export async function deleteLesson(userId: string, lessonId: string): Promise<boolean> {
  const [les] = await db
    .select({ lessonId: notebookLessons.id })
    .from(notebookLessons)
    .innerJoin(notebookModules, eq(notebookLessons.moduleId, notebookModules.id))
    .innerJoin(notebookCourses, eq(notebookModules.courseId, notebookCourses.id))
    .where(
      and(
        lessonIdFilter(userId, lessonId),
        eq(notebookCourses.userId, userId)
      )
    )
    .limit(1);

  if (!les) return false;

  const res = await db
    .delete(notebookLessons)
    .where(eq(notebookLessons.id, les.lessonId))
    .returning({ id: notebookLessons.id });

  return res.length > 0;
}

/**
 * Clears notes for a lesson (resets blocks to empty array)
 */
export async function clearLessonBlocks(userId: string, lessonId: string): Promise<boolean> {
  return (await saveLessonBlocks(userId, lessonId, [])).success;
}

/**
 * Fetches user notebook collisions
 */
export async function getNotebookCollisions(userId: string): Promise<CourseCollision[]> {
  const rows = await db
    .select()
    .from(notebookCollisions)
    .where(eq(notebookCollisions.userId, userId))
    .orderBy(desc(notebookCollisions.createdAt));

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    relation: (r.relation as any) || "same-idea",
    sourceA: r.sourceA,
    sourceB: r.sourceB,
  }));
}

/**
 * Saves notebook collisions for a user
 */
export async function saveNotebookCollisions(
  userId: string,
  collisions: CourseCollision[]
): Promise<boolean> {
  await db.delete(notebookCollisions).where(eq(notebookCollisions.userId, userId));

  if (collisions && collisions.length > 0) {
    for (const c of collisions) {
      await db.insert(notebookCollisions).values({
        id: toScopedId(userId, c.id),
        userId,
        title: c.title,
        description: c.description,
        relation: c.relation || "same-idea",
        sourceA: c.sourceA,
        sourceB: c.sourceB,
      });
    }
  }

  return true;
}

/**
 * Reorders lessons within a module or moves lessons across modules
 */
export async function reorderLessons(
  userId: string,
  courseId: string,
  sourceModuleId: string,
  targetModuleId: string,
  lessonId: string,
  targetIndex: number
): Promise<{ success: boolean; courses: SeedCourse[] }> {
  // 1. Verify user owns course
  const [course] = await db
    .select({ id: notebookCourses.id })
    .from(notebookCourses)
    .where(and(courseIdFilter(userId, courseId), eq(notebookCourses.userId, userId)))
    .limit(1);

  if (!course) return { success: false, courses: [] };

  // 2. Resolve module records
  const [srcMod] = await db
    .select({ id: notebookModules.id })
    .from(notebookModules)
    .where(and(moduleIdFilter(userId, sourceModuleId), eq(notebookModules.courseId, course.id)))
    .limit(1);

  const [tgtMod] = await db
    .select({ id: notebookModules.id })
    .from(notebookModules)
    .where(and(moduleIdFilter(userId, targetModuleId), eq(notebookModules.courseId, course.id)))
    .limit(1);

  if (!srcMod || !tgtMod) return { success: false, courses: [] };

  // 3. Resolve target lesson. lessonIdFilter alone includes a `LIKE '%_' + id`
  // clause that can match another user's scoped id sharing the same suffix —
  // harmless downstream here (the resolved id only survives if it's also
  // found in srcLessons, which IS ownership-scoped), but join through
  // course ownership directly so this lookup is correct on its own, not just
  // safe by accident of how its result happens to be used later.
  const [les] = await db
    .select({ id: notebookLessons.id })
    .from(notebookLessons)
    .innerJoin(notebookModules, eq(notebookLessons.moduleId, notebookModules.id))
    .innerJoin(notebookCourses, eq(notebookModules.courseId, notebookCourses.id))
    .where(and(lessonIdFilter(userId, lessonId), eq(notebookCourses.userId, userId)))
    .limit(1);

  if (!les) return { success: false, courses: [] };

  // 4. Fetch lessons from source and target modules
  const srcLessons = await db
    .select()
    .from(notebookLessons)
    .where(eq(notebookLessons.moduleId, srcMod.id))
    .orderBy(asc(notebookLessons.position));

  if (srcMod.id === tgtMod.id) {
    // Reorder within the same module
    const list = srcLessons.filter((l) => l.id !== les.id);
    const clampedIndex = Math.max(0, Math.min(targetIndex, list.length));
    const targetItem = srcLessons.find((l) => l.id === les.id);
    if (!targetItem) return { success: false, courses: [] };
    list.splice(clampedIndex, 0, targetItem);

    // targetItem is always spliced back in, so list.length >= 1 here.
    const updates = list.map((l, i) =>
      db.update(notebookLessons).set({ position: i }).where(eq(notebookLessons.id, l.id))
    );
    await db.batch([updates[0], ...updates.slice(1)]);
  } else {
    // Move across modules
    const tgtLessons = await db
      .select()
      .from(notebookLessons)
      .where(eq(notebookLessons.moduleId, tgtMod.id))
      .orderBy(asc(notebookLessons.position));

    const updatedSrc = srcLessons.filter((l) => l.id !== les.id);
    const targetItem = srcLessons.find((l) => l.id === les.id);
    if (!targetItem) return { success: false, courses: [] };

    const clampedIndex = Math.max(0, Math.min(targetIndex, tgtLessons.length));
    tgtLessons.splice(clampedIndex, 0, targetItem);

    // Re-index both modules' positions and move the lesson's parent in one
    // atomic batch. Run as two separate sequential update loops (as before),
    // a crash between them could leave the lesson's moduleId stale while
    // sibling positions had already shifted.
    const srcUpdates = updatedSrc.map((l, i) =>
      db.update(notebookLessons).set({ position: i }).where(eq(notebookLessons.id, l.id))
    );
    // tgtLessons always contains at least targetItem, so length >= 1.
    const tgtUpdates = tgtLessons.map((l, i) =>
      db.update(notebookLessons).set({ position: i, moduleId: tgtMod.id }).where(eq(notebookLessons.id, l.id))
    );
    const allUpdates = [...srcUpdates, ...tgtUpdates];
    await db.batch([allUpdates[0], ...allUpdates.slice(1)]);
  }

  const updatedCourses = await getUserNotebookCourses(userId);
  return { success: true, courses: updatedCourses };
}

/**
 * Duplicates a lesson and its blocks into the same module
 */
export async function duplicateLesson(
  userId: string,
  lessonId: string
): Promise<SeedCourseLesson | null> {
  const [les] = await db
    .select({
      id: notebookLessons.id,
      moduleId: notebookLessons.moduleId,
      title: notebookLessons.title,
      gap: notebookLessons.gap,
      lessonUrl: notebookLessons.lessonUrl,
      coverUrl: notebookLessons.coverUrl,
      icon: notebookLessons.icon,
    })
    .from(notebookLessons)
    .innerJoin(notebookModules, eq(notebookLessons.moduleId, notebookModules.id))
    .innerJoin(notebookCourses, eq(notebookModules.courseId, notebookCourses.id))
    .where(and(lessonIdFilter(userId, lessonId), eq(notebookCourses.userId, userId)))
    .limit(1);

  if (!les) return null;

  // Fetch source page blocks
  const [page] = await db
    .select({ blocks: notebookPages.blocks, wordCount: notebookPages.wordCount })
    .from(notebookPages)
    .where(eq(notebookPages.lessonId, les.id))
    .limit(1);

  const existing = await db
    .select({ id: notebookLessons.id })
    .from(notebookLessons)
    .where(eq(notebookLessons.moduleId, les.moduleId));

  const newLessonId = crypto.randomUUID();
  const title = `${les.title} (Copy)`;
  const blocks = (page?.blocks as Block[]) || [{ id: generateBlockId(), type: "paragraph", text: "" }];
  const wordCount = page?.wordCount || computeWordCount(blocks);

  await db.insert(notebookLessons).values({
    id: newLessonId,
    moduleId: les.moduleId,
    title,
    position: existing.length,
    watchedAt: null,
    gap: les.gap || [],
    lessonUrl: les.lessonUrl || null,
    coverUrl: les.coverUrl || null,
    icon: les.icon || null,
  });

  await db.insert(notebookPages).values({
    id: crypto.randomUUID(),
    lessonId: newLessonId,
    blocks,
    wordCount,
    updatedAt: new Date(),
  });

  return {
    id: newLessonId,
    title,
    watched: false,
    lessonUrl: les.lessonUrl || undefined,
    coverUrl: les.coverUrl || undefined,
    icon: les.icon || undefined,
    meta: formatLessonMeta(wordCount, false),
    blocks,
    gap: (les.gap as any) || [],
  };
}
