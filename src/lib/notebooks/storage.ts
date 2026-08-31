import { Block, computeWordCount, generateBlockId } from "./blocks";
import { SEED_COURSES, SEED_COLLISIONS, SeedCourse, CourseCollision } from "./seedData";

const COURSES_STORAGE_KEY = "hoard_notebook_courses_v2";

/**
 * Loads all courses with fallback to SEED_COURSES
 */
export function getStoredCourses(): SeedCourse[] {
  if (typeof window === "undefined") return SEED_COURSES;
  try {
    const raw = localStorage.getItem(COURSES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(SEED_COURSES));
      return SEED_COURSES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_COURSES;
  } catch (err) {
    console.error("Failed to load notebook courses:", err);
    return SEED_COURSES;
  }
}

/**
 * Saves all courses
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
 * Gets a course by ID
 */
export function getCourseById(courseId: string): SeedCourse | null {
  const courses = getStoredCourses();
  return courses.find((c) => c.id === courseId) || null;
}

/**
 * Pure in-memory update of a lesson's blocks. Does NOT touch localStorage —
 * callers that edit on every keystroke (the block editor) should debounce the
 * actual persistence separately via saveStoredCourses, since re-stringifying
 * every course/lesson/block (including any pasted base64 images) on every
 * keystroke is the single biggest cause of editor lag.
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
 * Saves blocks for a specific lesson, persisting immediately. Prefer
 * computeLessonBlocksUpdate + a debounced saveStoredCourses for hot paths
 * like keystroke-by-keystroke editing.
 */
export function saveLessonBlocks(courseId: string, lessonId: string, blocks: Block[]): SeedCourse[] {
  const courses = getStoredCourses();
  const updated = computeLessonBlocksUpdate(courses, courseId, lessonId, blocks);
  saveStoredCourses(updated);
  return updated;
}

/**
 * Toggles whether a lesson has been watched
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

/**
 * Adds a stub for a gap topic found in the transcript
 */
export function addLessonGapStub(
  courseId: string,
  lessonId: string,
  timestamp: string,
  topic: string
): SeedCourse[] {
  const courses = getStoredCourses();
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

const COLLISIONS_STORAGE_KEY = "hoard_notebook_collisions_v1";

/**
 * Returns all active collisions, preferring the last AI-found set over the seed
 * examples once the user has actually run "Find Collisions".
 */
export function getCollisions(): CourseCollision[] {
  if (typeof window === "undefined") return SEED_COLLISIONS;
  try {
    const raw = localStorage.getItem(COLLISIONS_STORAGE_KEY);
    if (!raw) return SEED_COLLISIONS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : SEED_COLLISIONS;
  } catch (err) {
    console.error("Failed to load notebook collisions:", err);
    return SEED_COLLISIONS;
  }
}

/**
 * Persists the results of an AI collision run so they survive a page reload
 * instead of reverting to the seed examples every time.
 */
export function saveCollisions(collisions: CourseCollision[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COLLISIONS_STORAGE_KEY, JSON.stringify(collisions));
  } catch (err) {
    console.error("Failed to save notebook collisions:", err);
  }
}
