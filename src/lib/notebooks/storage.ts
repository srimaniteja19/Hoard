import { Block, computeWordCount, generateBlockId } from "./blocks";
import { SEED_COURSES, SEED_COLLISIONS, SeedCourse, CourseCollision } from "./seedData";

const COURSES_STORAGE_KEY = "hoard_notebook_courses_v1";

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
 * Saves blocks for a specific lesson
 */
export function saveLessonBlocks(courseId: string, lessonId: string, blocks: Block[]): SeedCourse[] {
  const courses = getStoredCourses();
  const course = courses.find((c) => c.id === courseId);
  if (!course) return courses;

  for (const mod of course.modules) {
    const les = mod.lessons.find((l) => l.id === lessonId);
    if (les) {
      les.blocks = blocks;
      const wc = computeWordCount(blocks);
      les.meta = wc > 0 ? `${wc.toLocaleString()} WORDS · EDITED JUST NOW` : "NO NOTES YET";
      break;
    }
  }

  saveStoredCourses(courses);
  return courses;
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
 * Returns all active collisions
 */
export function getCollisions(): CourseCollision[] {
  return SEED_COLLISIONS;
}
