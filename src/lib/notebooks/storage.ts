import { Block, computeWordCount, generateBlockId } from "./blocks";
import { SEED_COURSES, SEED_COLLISIONS, SeedCourse, CourseCollision } from "./seedData";
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
  const course = courses.find((c) => c.id === courseId);
  if (!course) return courses;

  for (const mod of course.modules) {
    const les = mod.lessons.find((l) => l.id === lessonId);
    if (les) {
      les.watched = !les.watched;
      break;
    }
  }

  saveStoredCourses(courses);
  return courses;
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

  const course = courses.find((c) => c.id === courseId);
  if (!course) return courses;

  for (const mod of course.modules) {
    const les = mod.lessons.find((l) => l.id === lessonId);
    if (les) {
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
      les.blocks = [...currentBlocks, newHeading, newPara];
      // remove gap item from list if present
      if (les.gap) {
        les.gap = les.gap.filter((g) => g.timestamp !== timestamp || g.topic !== topic);
      }
      const wc = computeWordCount(les.blocks);
      les.meta = `${wc.toLocaleString()} WORDS · STUB ADDED`;
      break;
    }
  }

  saveStoredCourses(courses);
  return courses;
}

/**
 * Deletes a lesson/page completely from a course module
 */
export function deleteLesson(courseId: string, lessonId: string): SeedCourse[] {
  const courses = getStoredCourses();
  const course = courses.find((c) => c.id === courseId);
  if (!course) return courses;

  for (const mod of course.modules) {
    const idx = mod.lessons.findIndex((l) => l.id === lessonId);
    if (idx !== -1) {
      mod.lessons.splice(idx, 1);
      break;
    }
  }

  saveStoredCourses(courses);
  return courses;
}

/**
 * Clears all notes from a lesson/page (resets back to empty state)
 */
export function clearLessonNotes(courseId: string, lessonId: string): SeedCourse[] {
  const courses = getStoredCourses();
  const course = courses.find((c) => c.id === courseId);
  if (!course) return courses;

  for (const mod of course.modules) {
    const les = mod.lessons.find((l) => l.id === lessonId);
    if (les) {
      les.blocks = [];
      les.meta = "NO NOTES YET";
      break;
    }
  }

  saveStoredCourses(courses);
  return courses;
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

/**
 * Saves note blocks for a lesson to PostgreSQL with live status updates and offline queuing
 */
export async function saveLessonBlocksToDbApi(
  lessonId: string,
  blocks: Block[]
): Promise<boolean> {
  try {
    setSyncStatus("saving");
    const res = await fetch(`/api/notebooks/lessons/${encodeURIComponent(lessonId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks }),
    });

    if (res.ok) {
      setSyncStatus("saved");
      clearOfflineItem(lessonId);
      return true;
    } else {
      queueOfflineSave(lessonId, blocks);
      setSyncStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
      return false;
    }
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
    try {
      const res = await fetch(`/api/notebooks/lessons/${encodeURIComponent(item.lessonId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks: item.blocks }),
      });
      if (res.ok) {
        clearOfflineItem(item.lessonId);
      }
    } catch {
      setSyncStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
      return;
    }
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
 * Creates a new lesson/page in PostgreSQL
 */
export async function createLessonInDbApi(
  moduleId: string,
  title: string,
  blocks?: Block[]
): Promise<any | null> {
  try {
    setSyncStatus("saving");
    const res = await fetch("/api/notebooks/lessons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleId, title, blocks }),
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
    gap?: { timestamp: string; topic: string }[];
    lessonUrl?: string;
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
