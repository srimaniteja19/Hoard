import { Block, computeWordCount, generateBlockId } from "./blocks";
import { SEED_COURSES, SEED_COLLISIONS, SeedCourse, SeedCourseLesson, CourseCollision } from "./seedData";
import {
  setSyncStatus,
  broadcastRealtimeEvent,
  queueOfflineSave,
  clearOfflineItem,
  getOfflineQueue,
} from "./realtime";

const COURSES_STORAGE_KEY = "hoard_notebook_courses_v3";
const COLLISIONS_STORAGE_KEY = "hoard_notebook_collisions_v2";

/**
 * Loads all courses from localStorage with fallback to empty array
 */
export function getStoredCourses(): SeedCourse[] {
  if (typeof window === "undefined") return [];
  try {
    // Clean up legacy keys containing old seed/mock data
    localStorage.removeItem("hoard_notebook_courses_v1");
    localStorage.removeItem("hoard_notebook_courses_v2");
    localStorage.removeItem("hoard_notebook_courses");

    const raw = localStorage.getItem(COURSES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    
    // Filter out lingering mock seed items from old, pre-scoping caches. Only
    // the exact legacy unscoped ids are stripped — a suffix match would also
    // catch real per-user scoped ids like `${userId}_agentic` for a genuine
    // course whose slug happens to be "agentic", silently deleting it.
    const cleaned = parsed.filter((c) => c && c.id !== "agentic" && c.id !== "python");
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch (err) {
    console.error("Failed to load notebook courses:", err);
    return [];
  }
}

/**
 * Saves all courses to localStorage mirror
 */
export function saveStoredCourses(courses: SeedCourse[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(courses));
  } catch (err) {
    console.error("Failed to save notebook courses:", err);
  }
}

/**
 * Gets a course by ID from local cache
 */
export function getCourseById(courseId: string): SeedCourse | null {
  const courses = getStoredCourses();
  return courses.find((c) => c.id === courseId) || null;
}

/**
 * Pure in-memory update of a lesson's blocks.
 */
export function computeLessonBlocksUpdate(
  courses: SeedCourse[],
  courseId: string,
  lessonId: string,
  blocks: Block[]
): SeedCourse[] {
  const wc = computeWordCount(blocks);
  const nextMeta = wc > 0 ? `${wc.toLocaleString()} WORDS · EDITED JUST NOW` : "NO NOTES YET";

  return courses.map((course) => {
    if (course.id !== courseId) return course;
    return {
      ...course,
      modules: course.modules.map((mod) => ({
        ...mod,
        lessons: mod.lessons.map((les) =>
          les.id === lessonId ? { ...les, blocks, meta: nextMeta } : les
        ),
      })),
    };
  });
}

/**
 * Saves blocks for a specific lesson locally and mirrors to localStorage
 */
export function saveLessonBlocks(courseId: string, lessonId: string, blocks: Block[]): SeedCourse[] {
  const courses = getStoredCourses();
  const updated = computeLessonBlocksUpdate(courses, courseId, lessonId, blocks);
  saveStoredCourses(updated);
  return updated;
}

/**
 * Toggles whether a lesson has been watched in local state
 */
export function toggleLessonWatched(courseId: string, lessonId: string): SeedCourse[] {
  const courses = getStoredCourses();
  const updated = courses.map((course) => {
    if (course.id !== courseId) return course;
    return {
      ...course,
      modules: course.modules.map((mod) => ({
        ...mod,
        lessons: mod.lessons.map((les) => (les.id === lessonId ? { ...les, watched: !les.watched } : les)),
      })),
    };
  });
  saveStoredCourses(updated);
  return updated;
}

export function addLessonGapStub(
  courses: SeedCourse[],
  courseId: string,
  lessonId: string,
  timestamp: string,
  topic: string
): SeedCourse[];
export function addLessonGapStub(
  courseId: string,
  lessonId: string,
  timestamp: string,
  topic: string,
  currentCourses?: SeedCourse[]
): SeedCourse[];
export function addLessonGapStub(
  arg1: string | SeedCourse[],
  arg2: string,
  arg3: string,
  arg4: string,
  arg5?: string | SeedCourse[]
): SeedCourse[] {
  let courses: SeedCourse[];
  let courseId: string;
  let lessonId: string;
  let timestamp: string;
  let topic: string;

  if (Array.isArray(arg1)) {
    courses = arg1;
    courseId = arg2;
    lessonId = arg3;
    timestamp = arg4;
    topic = (arg5 as string) || "";
  } else {
    courses = Array.isArray(arg5) ? arg5 : getStoredCourses();
    courseId = arg1;
    lessonId = arg2;
    timestamp = arg3;
    topic = arg4;
  }

  // Immutable update: `courses` may be the live React state array (the
  // first call signature passes it in explicitly), so mutating lesson
  // objects in place — as this used to — leaves the returned array
  // reference-equal to the input, which can silently fail to trigger a
  // re-render for callers that rely on reference-based change detection.
  const updated = courses.map((course) => {
    if (course.id !== courseId) return course;
    return {
      ...course,
      modules: course.modules.map((mod) => ({
        ...mod,
        lessons: mod.lessons.map((les) => {
          if (les.id !== lessonId) return les;
          const currentBlocks = les.blocks || [];
          const newHeading: Block = {
            id: generateBlockId(),
            type: "heading",
            level: 3,
            text: `[⏱ ${timestamp}] ${topic}`,
          };
          const newPara: Block = {
            id: generateBlockId(),
            type: "paragraph",
            text: "",
          };
          const nextBlocks = [...currentBlocks, newHeading, newPara];
          // remove gap item from list if present
          const nextGap = les.gap ? les.gap.filter((g) => g.timestamp !== timestamp || g.topic !== topic) : les.gap;
          const wc = computeWordCount(nextBlocks);
          return {
            ...les,
            blocks: nextBlocks,
            gap: nextGap,
            meta: `${wc.toLocaleString()} WORDS · STUB ADDED`,
          };
        }),
      })),
    };
  });

  saveStoredCourses(updated);
  return updated;
}

/**
 * Deletes a lesson/page completely from a course module
 */
export function deleteLesson(courseId: string, lessonId: string): SeedCourse[] {
  const courses = getStoredCourses();
  const updated = courses.map((course) => {
    if (course.id !== courseId) return course;
    return {
      ...course,
      modules: course.modules.map((mod) => ({
        ...mod,
        lessons: mod.lessons.filter((l) => l.id !== lessonId),
      })),
    };
  });
  saveStoredCourses(updated);
  return updated;
}

/**
 * Clears all notes from a lesson/page (resets back to empty state)
 */
export function clearLessonNotes(courseId: string, lessonId: string): SeedCourse[] {
  const courses = getStoredCourses();
  const updated = courses.map((course) => {
    if (course.id !== courseId) return course;
    return {
      ...course,
      modules: course.modules.map((mod) => ({
        ...mod,
        lessons: mod.lessons.map((les) =>
          les.id === lessonId ? { ...les, blocks: [], meta: "NO NOTES YET" } : les
        ),
      })),
    };
  });
  saveStoredCourses(updated);
  return updated;
}

/**
 * Creates a new course
 */
export function createNewCourse(
  title: string,
  provider: string = "DEEPLEARNING.AI",
  accent: string = "#7B5CF0",
  accentFg: string = "#FFFFFF"
): SeedCourse {
  const courses = getStoredCourses();
  const id = "course-" + Date.now().toString(36);
  const newCourse: SeedCourse = {
    id,
    title: title.trim(),
    provider: provider.trim().toUpperCase(),
    accent,
    accentFg,
    init: title.trim().charAt(0).toUpperCase() || "C",
    startedAt: new Date().toISOString(),
    modules: [
      {
        id: `mod-${id}-1`,
        title: "MODULE 1 · GETTING STARTED",
        lessons: [
          {
            id: `les-${id}-1-1`,
            title: "Course Overview and Syllabus",
            watched: true,
            meta: "STUB · 1 LINE",
            blocks: [
              {
                id: generateBlockId(),
                type: "paragraph",
                text: "Overview of learning outcomes, prerequisites, and development setup.",
              },
            ],
          },
        ],
      },
    ],
  };

  courses.push(newCourse);
  saveStoredCourses(courses);
  return newCourse;
}

/**
 * Returns all active collisions from local cache
 */
export function getCollisions(): CourseCollision[] {
  if (typeof window === "undefined") return [];
  try {
    localStorage.removeItem("hoard_notebook_collisions_v1");
    const raw = localStorage.getItem(COLLISIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Failed to load notebook collisions:", err);
    return [];
  }
}

/**
 * Persists the results of an AI collision run to local storage
 */
export function saveCollisions(collisions: CourseCollision[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COLLISIONS_STORAGE_KEY, JSON.stringify(collisions));
  } catch (err) {
    console.error("Failed to save notebook collisions:", err);
  }
}

// ─────────────────────────────────────────────────────────
// SERVER DATABASE API CALLS
// ─────────────────────────────────────────────────────────

/**
 * Fetches all courses and collisions from PostgreSQL
 */
export async function fetchNotebooksFromDbApi(): Promise<{
  courses: SeedCourse[];
  collisions: CourseCollision[];
} | null> {
  try {
    const res = await fetch("/api/notebooks", { cache: "no-store" });
    if (!res.ok) {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setSyncStatus("offline");
      }
      return null;
    }
    const data = await res.json();
    setSyncStatus("saved");
    return {
      courses: data.courses || [],
      collisions: data.collisions || [],
    };
  } catch (err) {
    console.error("[fetchNotebooksFromDbApi] Failed:", err);
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSyncStatus("offline");
    } else {
      setSyncStatus("error");
    }
    return null;
  }
}

/**
 * Syncs/imports courses and collisions into PostgreSQL
 */
export async function syncCoursesToDbApi(
  courses: SeedCourse[],
  collisions?: CourseCollision[]
): Promise<SeedCourse[] | null> {
  try {
    setSyncStatus("saving");
    const res = await fetch("/api/notebooks/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courses, collisions }),
    });
    if (!res.ok) {
      setSyncStatus("error");
      return null;
    }
    const data = await res.json();
    setSyncStatus("saved");
    broadcastRealtimeEvent({ type: "FULL_SYNC_REQUESTED" });
    return data.courses || null;
  } catch (err) {
    console.error("[syncCoursesToDbApi] Failed:", err);
    setSyncStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
    return null;
  }
}

// Tracks each lesson's page `updatedAt` as an optimistic-concurrency token,
// so out-of-order concurrent saves for the same lesson (slow request landing
// after a faster later one) are detected instead of silently clobbering
// newer content. Seeded from the initial fetch via primeLessonBlocksVersion.
const lastKnownBlocksUpdatedAt = new Map<string, string>();

/**
 * Seeds the concurrency token for a lesson from freshly-fetched server data
 * (e.g. after the initial notebooks load), so the very first save of a
 * session already has a baseline to check against.
 */
export function primeLessonBlocksVersion(lessonId: string, updatedAt: string | undefined): void {
  if (updatedAt) lastKnownBlocksUpdatedAt.set(lessonId, updatedAt);
}

/**
 * Saves note blocks for a lesson to PostgreSQL with live status updates and offline queuing
 */
export async function saveLessonBlocksToDbApi(
  lessonId: string,
  blocks: Block[],
  allowConflictRetry = true
): Promise<boolean> {
  try {
    setSyncStatus("saving");
    const expectedUpdatedAt = lastKnownBlocksUpdatedAt.get(lessonId);
    const res = await fetch(`/api/notebooks/lessons/${encodeURIComponent(lessonId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks, expectedUpdatedAt }),
    });

    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data?.updatedAt) lastKnownBlocksUpdatedAt.set(lessonId, data.updatedAt);
      setSyncStatus("saved");
      clearOfflineItem(lessonId);
      return true;
    }

    if (res.status === 409 && allowConflictRetry) {
      // Another save for this lesson landed first. Our local `blocks` still
      // reflect the user's true latest edit — only the version token was
      // stale — so resync it from the conflict response and retry once
      // instead of silently dropping the edit or surfacing a false error.
      const data = await res.json().catch(() => null);
      if (data?.updatedAt) lastKnownBlocksUpdatedAt.set(lessonId, data.updatedAt);
      return saveLessonBlocksToDbApi(lessonId, blocks, false);
    }

    queueOfflineSave(lessonId, blocks);
    setSyncStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
    return false;
  } catch (err) {
    console.error("[saveLessonBlocksToDbApi] Failed:", err);
    queueOfflineSave(lessonId, blocks);
    setSyncStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
    return false;
  }
}

/**
 * Flushes all pending offline saves to PostgreSQL
 */
export async function flushOfflineQueueToDbApi(): Promise<void> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return;
  setSyncStatus("saving");
  for (const item of queue) {
    // Reuse the same optimistic-concurrency-aware save path as the live
    // editor so a queued offline edit can't blindly clobber a newer save
    // that already landed from another device/tab while this one was offline.
    const ok = await saveLessonBlocksToDbApi(item.lessonId, item.blocks);
    if (!ok) return;
  }
  setSyncStatus("saved");
}

/**
 * Creates a course in PostgreSQL
 */
export async function createCourseInDbApi(data: {
  title: string;
  provider?: string;
  accent?: string;
  accentFg?: string;
  init?: string;
  url?: string;
}): Promise<SeedCourse | null> {
  try {
    setSyncStatus("saving");
    const res = await fetch("/api/notebooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      setSyncStatus("error");
      return null;
    }
    const json = await res.json();
    setSyncStatus("saved");
    if (json.course) {
      broadcastRealtimeEvent({
        type: "COURSE_UPDATED",
        courseId: json.course.id,
        course: json.course,
      });
    }
    return json.course || null;
  } catch (err) {
    console.error("[createCourseInDbApi] Failed:", err);
    setSyncStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
    return null;
  }
}

/**
 * Updates a course in PostgreSQL
 */
export async function updateCourseInDbApi(
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
  try {
    setSyncStatus("saving");
    const res = await fetch(`/api/notebooks/${encodeURIComponent(courseId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setSyncStatus("saved");
      broadcastRealtimeEvent({ type: "FULL_SYNC_REQUESTED" });
      return true;
    }
    setSyncStatus("error");
    return false;
  } catch (err) {
    console.error("[updateCourseInDbApi] Failed:", err);
    setSyncStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
    return false;
  }
}

/**
 * Deletes a course from PostgreSQL
 */
export async function deleteCourseFromDbApi(courseId: string): Promise<boolean> {
  try {
    setSyncStatus("saving");
    const res = await fetch(`/api/notebooks/${encodeURIComponent(courseId)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setSyncStatus("saved");
      broadcastRealtimeEvent({ type: "COURSE_DELETED", courseId });
      return true;
    }
    setSyncStatus("error");
    return false;
  } catch (err) {
    console.error("[deleteCourseFromDbApi] Failed:", err);
    setSyncStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
    return false;
  }
}

/**
 * Creates a new module in a course in PostgreSQL
 */
export async function createModuleInDbApi(
  courseId: string,
  title: string,
  targetPosition?: number
): Promise<any | null> {
  try {
    setSyncStatus("saving");
    const res = await fetch("/api/notebooks/modules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, title, targetPosition }),
    });
    if (!res.ok) {
      setSyncStatus("error");
      return null;
    }
    const json = await res.json();
    setSyncStatus("saved");
    if (json.module) {
      broadcastRealtimeEvent({
        type: "MODULE_CREATED",
        courseId,
        module: json.module,
      });
    }
    return json.module || null;
  } catch (err) {
    console.error("[createModuleInDbApi] Failed:", err);
    setSyncStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
    return null;
  }
}

/**
 * Updates a module in PostgreSQL
 */
export async function updateModuleInDbApi(
  moduleId: string,
  updates: { title?: string; position?: number }
): Promise<boolean> {
  try {
    setSyncStatus("saving");
    const res = await fetch(`/api/notebooks/modules/${encodeURIComponent(moduleId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      setSyncStatus("saved");
      broadcastRealtimeEvent({
        type: "MODULE_UPDATED",
        moduleId,
        title: updates.title,
      });
      return true;
    }
    setSyncStatus("error");
    return false;
  } catch (err) {
    console.error("[updateModuleInDbApi] Failed:", err);
    setSyncStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
    return false;
  }
}

/**
 * Deletes a module and all its lessons in PostgreSQL
 */
export async function deleteModuleInDbApi(moduleId: string): Promise<boolean> {
  try {
    setSyncStatus("saving");
    const res = await fetch(`/api/notebooks/modules/${encodeURIComponent(moduleId)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setSyncStatus("saved");
      broadcastRealtimeEvent({
        type: "MODULE_DELETED",
        moduleId,
      });
      return true;
    }
    setSyncStatus("error");
    return false;
  } catch (err) {
    console.error("[deleteModuleInDbApi] Failed:", err);
    return false;
  }
}

export interface LessonTreeNode {
  lesson: SeedCourseLesson;
  level: number;
  children: LessonTreeNode[];
}

/**
 * Builds a recursive tree structure from a list of lessons in a module.
 */
export function buildLessonTree(lessons: SeedCourseLesson[]): LessonTreeNode[] {
  const byParent = new Map<string | null, SeedCourseLesson[]>();
  for (const les of lessons) {
    const pId = les.parentId || null;
    if (!byParent.has(pId)) byParent.set(pId, []);
    byParent.get(pId)!.push(les);
  }

  function buildSubtree(parentId: string | null, level: number): LessonTreeNode[] {
    const list = byParent.get(parentId) || [];
    return list.map((les) => ({
      lesson: les,
      level,
      children: buildSubtree(les.id, level + 1),
    }));
  }

  return buildSubtree(null, 0);
}

/**
 * Traverses upwards to get the breadcrumb path of ancestors for a given lesson.
 */
export function getLessonAncestors(lessons: SeedCourseLesson[], lessonId: string): SeedCourseLesson[] {
  const map = new Map(lessons.map((l) => [l.id, l]));
  const path: SeedCourseLesson[] = [];
  let curr = map.get(lessonId);
  while (curr) {
    path.unshift(curr);
    curr = curr.parentId ? map.get(curr.parentId) : undefined;
  }
  return path;
}

/**
 * Gets direct child subpages for a given parent lesson.
 */
export function getDirectChildLessons(lessons: SeedCourseLesson[], parentId: string): SeedCourseLesson[] {
  return lessons.filter((l) => l.parentId === parentId);
}

/**
 * Creates a new lesson/page in PostgreSQL
 */
export async function createLessonInDbApi(
  moduleId: string,
  title: string,
  blocks?: Block[],
  targetPosition?: number,
  extra?: {
    id?: string;
    parentId?: string | null;
    coverUrl?: string | null;
    icon?: string | null;
    lessonUrl?: string | null;
  }
): Promise<any | null> {
  try {
    setSyncStatus("saving");
    const res = await fetch("/api/notebooks/lessons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleId, title, blocks, targetPosition, ...extra }),
    });
    if (!res.ok) {
      setSyncStatus("error");
      return null;
    }
    const json = await res.json();
    setSyncStatus("saved");
    if (json.lesson) {
      broadcastRealtimeEvent({
        type: "LESSON_CREATED",
        moduleId,
        lesson: json.lesson,
      });
    }
    return json.lesson || null;
  } catch (err) {
    console.error("[createLessonInDbApi] Failed:", err);
    setSyncStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
    return null;
  }
}

/**
 * Updates lesson metadata or toggles watched status in PostgreSQL
 */
export async function updateLessonInDbApi(
  lessonId: string,
  data: {
    title?: string;
    parentId?: string | null;
    gap?: { timestamp: string; topic: string }[];
    lessonUrl?: string | null;
    coverUrl?: string | null;
    icon?: string | null;
    watched?: boolean;
    toggleWatched?: boolean;
    clearNotes?: boolean;
  }
): Promise<boolean> {
  try {
    setSyncStatus("saving");
    const res = await fetch(`/api/notebooks/lessons/${encodeURIComponent(lessonId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setSyncStatus("saved");
      if (data.watched !== undefined || data.toggleWatched !== undefined) {
        broadcastRealtimeEvent({
          type: "LESSON_WATCHED_TOGGLED",
          lessonId,
          watched: Boolean(data.watched),
        });
      }
      if (data.gap !== undefined) {
        broadcastRealtimeEvent({
          type: "LESSON_GAP_ADDED",
          lessonId,
          gap: data.gap,
        });
      }
      return true;
    }
    setSyncStatus("error");
    return false;
  } catch (err) {
    console.error("[updateLessonInDbApi] Failed:", err);
    setSyncStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
    return false;
  }
}

/**
 * Deletes a lesson/page from PostgreSQL
 */
export async function deleteLessonFromDbApi(lessonId: string): Promise<boolean> {
  try {
    setSyncStatus("saving");
    const res = await fetch(`/api/notebooks/lessons/${encodeURIComponent(lessonId)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setSyncStatus("saved");
      broadcastRealtimeEvent({ type: "LESSON_DELETED", lessonId });
      return true;
    }
    setSyncStatus("error");
    return false;
  } catch (err) {
    console.error("[deleteLessonFromDbApi] Failed:", err);
    setSyncStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
    return false;
  }
}

/**
 * Reorders lessons in memory across modules and updates localStorage
 */
export function reorderLessonsInMemory(
  courses: SeedCourse[],
  courseId: string,
  sourceModuleId: string,
  targetModuleId: string,
  lessonId: string,
  targetIndex: number
): SeedCourse[] {
  const isSame = (a: string, b: string) => a === b || a.endsWith("_" + b) || b.endsWith("_" + a);
  const updated = courses.map((c) => {
    if (!isSame(c.id, courseId)) return c;

    const sourceMod = c.modules.find((m) => isSame(m.id, sourceModuleId));
    const targetMod = c.modules.find((m) => isSame(m.id, targetModuleId));
    if (!sourceMod || !targetMod) return c;

    const targetLesson = sourceMod.lessons.find((l) => isSame(l.id, lessonId));
    if (!targetLesson) return c;

    if (isSame(sourceMod.id, targetMod.id)) {
      const filtered = sourceMod.lessons.filter((l) => !isSame(l.id, lessonId));
      const clamped = Math.max(0, Math.min(targetIndex, filtered.length));
      filtered.splice(clamped, 0, targetLesson);
      return {
        ...c,
        modules: c.modules.map((m) => (isSame(m.id, sourceMod.id) ? { ...m, lessons: filtered } : m)),
      };
    } else {
      const updatedSrcLessons = sourceMod.lessons.filter((l) => !isSame(l.id, lessonId));
      const updatedTgtLessons = [...targetMod.lessons];
      const clamped = Math.max(0, Math.min(targetIndex, updatedTgtLessons.length));
      updatedTgtLessons.splice(clamped, 0, targetLesson);

      return {
        ...c,
        modules: c.modules.map((m) => {
          if (isSame(m.id, sourceMod.id)) return { ...m, lessons: updatedSrcLessons };
          if (isSame(m.id, targetMod.id)) return { ...m, lessons: updatedTgtLessons };
          return m;
        }),
      };
    }
  });

  saveStoredCourses(updated);
  return updated;
}

/**
 * Persists lesson reordering to PostgreSQL and broadcasts to other tabs
 */
export async function reorderLessonsInDbApi(
  courseId: string,
  sourceModuleId: string,
  targetModuleId: string,
  lessonId: string,
  newIndex: number
): Promise<boolean> {
  try {
    setSyncStatus("saving");
    const res = await fetch("/api/notebooks/lessons/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId,
        sourceModuleId,
        targetModuleId,
        lessonId,
        newIndex,
      }),
    });
    if (res.ok) {
      setSyncStatus("saved");
      broadcastRealtimeEvent({
        type: "LESSONS_REORDERED",
        courseId,
        sourceModuleId,
        targetModuleId,
        lessonId,
        targetIndex: newIndex,
      });
      return true;
    }
    setSyncStatus("error");
    return false;
  } catch (err) {
    console.error("[reorderLessonsInDbApi] Failed:", err);
    setSyncStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
    return false;
  }
}

/**
 * Duplicates a lesson and its blocks in PostgreSQL
 */
export async function duplicateLessonInDbApi(
  lessonId: string
): Promise<SeedCourseLesson | null> {
  try {
    setSyncStatus("saving");
    const res = await fetch(`/api/notebooks/lessons/${encodeURIComponent(lessonId)}/duplicate`, {
      method: "POST",
    });
    if (res.ok) {
      const data = await res.json();
      setSyncStatus("saved");
      return data.lesson || null;
    }
    setSyncStatus("error");
    return null;
  } catch (err) {
    console.error("[duplicateLessonInDbApi] Failed:", err);
    setSyncStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
    return null;
  }
}
