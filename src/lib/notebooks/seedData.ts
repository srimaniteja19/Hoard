import { Block } from "./blocks";

export interface SeedCourseLesson {
  id: string;
  title: string;
  watched: boolean;
  meta: string;
  blocks?: Block[];
  gap?: { timestamp: string; topic: string }[];
  lessonUrl?: string | null;
  transcript?: {
    text: string;
    cues: { t: string; text: string }[];
  };
}

export interface SeedCourseModule {
  id: string;
  title: string;
  lessons: SeedCourseLesson[];
}

export interface SeedCourse {
  id: string;
  title: string;
  provider: string;
  accent: string;
  accentFg: string;
  init: string;
  startedAt: string;
  modules: SeedCourseModule[];
}

export interface CourseCollision {
  id: string;
  title: string;
  description: string;
  relation?: "same-idea" | "same-words" | "contradiction" | "open-in-both";
  sourceA: { course: string; lesson: string };
  sourceB: { course: string; lesson: string };
}

/**
 * Clean baseline defaults (zero mock/example seed data)
 */
export const SEED_COURSES: SeedCourse[] = [];
export const SEED_COLLISIONS: CourseCollision[] = [];
