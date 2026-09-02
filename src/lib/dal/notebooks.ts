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
  NotebookLessonRow,
  NotebookPageRow,
  NotebookTranscriptRow,
  NotebookCollisionRow,
} from "@/db/schema";
import { eq, and, or, like, asc, desc, inArray } from "drizzle-orm";
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
      meta: formatLessonMeta(wordCount, Boolean(gap && gap.length > 0)),
      blocks,
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
  collisions?: CourseCollision[]
): Promise<SeedCourse[]> {
  if (!courses || courses.length === 0) return [];

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

  await db.insert(notebookCourses).values({
    id: courseId,
    userId,
    title,
    provider: (data.provider || "DEEPLEARNING.AI").trim().toUpperCase(),
    accent: data.accent || "#7B5CF0",
    accentFg: data.accentFg || "#FFFFFF",
    init,
    url: data.url || null,
    startedAt: new Date(),
  });

  // Create Module 1
  const moduleId = crypto.randomUUID();
  await db.insert(notebookModules).values({
    id: moduleId,
    courseId,
    title: "MODULE 1 · GETTING STARTED",
    position: 0,
  });

  // Create Lesson 1
  const lessonId = crypto.randomUUID();
  const initialBlocks: Block[] = [
    {
      id: generateBlockId(),
      type: "paragraph",
      text: "Overview of learning outcomes, prerequisites, and development setup.",
    },
  ];

  await db.insert(notebookLessons).values({
    id: lessonId,
    moduleId,
    title: "Course Overview and Syllabus",
    position: 0,
    watchedAt: new Date(),
    gap: [],
  });

  await db.insert(notebookPages).values({
    id: crypto.randomUUID(),
    lessonId,
    blocks: initialBlocks,
    wordCount: computeWordCount(initialBlocks),
    updatedAt: new Date(),
  });

  const [course] = await getUserNotebookCourses(userId);
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
 * Creates a new lesson / page inside a module.
 */
export async function createLesson(
  userId: string,
  moduleId: string,
  title: string,
  blocks?: Block[]
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
    .select({ id: notebookLessons.id })
    .from(notebookLessons)
    .where(eq(notebookLessons.moduleId, mod.moduleId));

  const position = existing.length;
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
  blocks: Block[]
): Promise<{ success: boolean; wordCount: number }> {
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
    .select({ id: notebookPages.id })
    .from(notebookPages)
    .where(eq(notebookPages.lessonId, les.lessonId))
    .limit(1);

  if (existingPage) {
    await db
      .update(notebookPages)
      .set({
        blocks,
        wordCount,
        updatedAt: new Date(),
      })
      .where(eq(notebookPages.lessonId, les.lessonId));
  } else {
    await db.insert(notebookPages).values({
      id: crypto.randomUUID(),
      lessonId: les.lessonId,
      blocks,
      wordCount,
      updatedAt: new Date(),
    });
  }

  return { success: true, wordCount };
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
    lessonUrl?: string;
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
  if (data.lessonUrl !== undefined) updateFields.lessonUrl = data.lessonUrl;
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

  // 3. Resolve target lesson
  const [les] = await db
    .select({ id: notebookLessons.id })
    .from(notebookLessons)
    .where(lessonIdFilter(userId, lessonId))
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

    for (let i = 0; i < list.length; i++) {
      await db
        .update(notebookLessons)
        .set({ position: i })
        .where(eq(notebookLessons.id, list[i].id));
    }
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

    // Update source module positions
    for (let i = 0; i < updatedSrc.length; i++) {
      await db
        .update(notebookLessons)
        .set({ position: i })
        .where(eq(notebookLessons.id, updatedSrc[i].id));
    }

    // Update target module positions and parent moduleId
    for (let i = 0; i < tgtLessons.length; i++) {
      await db
        .update(notebookLessons)
        .set({ position: i, moduleId: tgtMod.id })
        .where(eq(notebookLessons.id, tgtLessons[i].id));
    }
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
    meta: formatLessonMeta(wordCount, false),
    blocks,
    gap: (les.gap as any) || [],
  };
}
