import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  computeLessonBlocksUpdate,
  addLessonGapStub,
  createNewCourse,
  deleteLesson,
  clearLessonNotes,
  toggleLessonWatched,
  getStoredCourses,
  saveStoredCourses,
  reorderLessonsInMemory,
} from "./storage";
import { SEED_COURSES, SeedCourse } from "./seedData";
import { Block, convertBlocksToMarkdown } from "./blocks";

function makeMinimalCourse(id: string, title: string): SeedCourse {
  return {
    id,
    title,
    provider: "TEST",
    accent: "#000",
    accentFg: "#FFF",
    init: title.charAt(0).toUpperCase(),
    startedAt: "2026-01-01",
    modules: [],
  };
}

function createMockLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
}

describe("Notebooks Storage & In-Memory Logic", () => {
  it("updates lesson blocks in memory without mutating original unselected lessons", () => {
    const courses: SeedCourse[] = [
      {
        id: "test-c1",
        title: "Test Course",
        provider: "TEST",
        accent: "#000",
        accentFg: "#FFF",
        init: "T",
        startedAt: "2026-01-01",
        modules: [
          {
            id: "m1",
            title: "Module 1",
            lessons: [
              {
                id: "l1",
                title: "Lesson 1",
                watched: false,
                meta: "NO NOTES YET",
                blocks: [],
              },
              {
                id: "l2",
                title: "Lesson 2",
                watched: false,
                meta: "NO NOTES YET",
                blocks: [],
              },
            ],
          },
        ],
      },
    ];
    const targetCourse = courses[0];
    const targetLesson = targetCourse.modules[0].lessons[0];

    const newBlocks: Block[] = [
      { id: "b1", type: "paragraph", text: "New testing paragraph note" },
      { id: "b2", type: "callout", kind: "gotcha", text: "Pitfall here" },
    ];

    const updated = computeLessonBlocksUpdate(courses, targetCourse.id, targetLesson.id, newBlocks);
    const updatedLesson = updated[0].modules[0].lessons[0];

    expect(updatedLesson.blocks).toHaveLength(2);
    expect(updatedLesson.meta).toContain("WORDS · EDITED JUST NOW");
    // Ensure second lesson untouched
    expect(updated[0].modules[0].lessons[1]?.id).toBe(courses[0].modules[0].lessons[1]?.id);
  });

  it("adds gap topic stubs seamlessly into lesson", () => {
    const courses: SeedCourse[] = [
      {
        id: "test-c1",
        title: "Test Course",
        provider: "TEST",
        accent: "#000",
        accentFg: "#FFF",
        init: "T",
        startedAt: "2026-01-01",
        modules: [
          {
            id: "m1",
            title: "Module 1",
            lessons: [
              {
                id: "l1",
                title: "Lesson 1",
                watched: false,
                meta: "NO NOTES YET",
                blocks: [],
                gap: [{ timestamp: "04:12", topic: "Agent Memory" }],
              },
            ],
          },
        ],
      },
    ];

    const updated = addLessonGapStub(courses, "test-c1", "l1", "04:12", "Agent Memory");
    const lesson = updated[0].modules[0].lessons[0];

    expect(lesson.blocks?.length).toBe(2);
    expect(lesson.blocks?.[0].type).toBe("heading");
    expect((lesson.blocks?.[0] as any).text).toContain("[⏱ 04:12] Agent Memory");
    expect(lesson.gap).toHaveLength(0); // removed added gap
  });

  it("creates new course with initial module and stub lesson", () => {
    const course = createNewCourse("Distributed Systems", "MIT", "#FF0000", "#FFFFFF");

    expect(course.title).toBe("Distributed Systems");
    expect(course.provider).toBe("MIT");
    expect(course.accent).toBe("#FF0000");
    expect(course.init).toBe("D");
    expect(course.modules).toHaveLength(1);
    expect(course.modules[0].lessons).toHaveLength(1);
  });

  it("reorders lessons within the same module correctly", () => {
    const courses: SeedCourse[] = [
      {
        id: "c1",
        title: "Course 1",
        provider: "TEST",
        accent: "#000",
        accentFg: "#FFF",
        init: "C",
        startedAt: "2026-01-01",
        modules: [
          {
            id: "m1",
            title: "Module 1",
            lessons: [
              { id: "l1", title: "Page 1", watched: false, meta: "", blocks: [] },
              { id: "l2", title: "Page 2", watched: false, meta: "", blocks: [] },
              { id: "l3", title: "Page 3", watched: false, meta: "", blocks: [] },
            ],
          },
        ],
      },
    ];

    // Move l3 to index 0 (top)
    const updated = reorderLessonsInMemory(courses, "c1", "m1", "m1", "l3", 0);
    expect(updated[0].modules[0].lessons.map((l) => l.id)).toEqual(["l3", "l1", "l2"]);
  });

  it("moves lessons across different modules correctly", () => {
    const courses: SeedCourse[] = [
      {
        id: "c1",
        title: "Course 1",
        provider: "TEST",
        accent: "#000",
        accentFg: "#FFF",
        init: "C",
        startedAt: "2026-01-01",
        modules: [
          {
            id: "m1",
            title: "Module 1",
            lessons: [
              { id: "l1", title: "Page 1", watched: false, meta: "", blocks: [] },
              { id: "l2", title: "Page 2", watched: false, meta: "", blocks: [] },
            ],
          },
          {
            id: "m2",
            title: "Module 2",
            lessons: [
              { id: "l3", title: "Page 3", watched: false, meta: "", blocks: [] },
            ],
          },
        ],
      },
    ];

    // Move l1 from m1 into m2 at index 0
    const updated = reorderLessonsInMemory(courses, "c1", "m1", "m2", "l1", 0);
    expect(updated[0].modules[0].lessons.map((l) => l.id)).toEqual(["l2"]);
    expect(updated[0].modules[1].lessons.map((l) => l.id)).toEqual(["l1", "l3"]);
  });

  it("converts blocks to formatted markdown accurately", () => {
    const blocks: Block[] = [
      { id: "b1", type: "heading", level: 2, text: "Introduction" },
      { id: "b2", type: "paragraph", text: "This is a key note paragraph." },
      { id: "b3", type: "code", lang: "PYTHON", code: "print('hello')" },
      { id: "b4", type: "callout", kind: "gotcha", text: "Watch out for race conditions" },
      { id: "b5", type: "todo", items: [{ text: "Write unit tests", done: true }] },
    ];

    const md = convertBlocksToMarkdown("My Page Title", blocks);
    expect(md).toContain("# My Page Title");
    expect(md).toContain("## Introduction");
    expect(md).toContain("This is a key note paragraph.");
    expect(md).toContain("```python\nprint('hello')\n```");
    expect(md).toContain("> [!GOTCHA]\n> Watch out for race conditions");
    expect(md).toContain("- [x] Write unit tests");
  });

  describe("getStoredCourses legacy-mock cleanup", () => {
    let mockStorage: ReturnType<typeof createMockLocalStorage>;

    beforeEach(() => {
      mockStorage = createMockLocalStorage();
      vi.stubGlobal("window", {});
      vi.stubGlobal("localStorage", mockStorage);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("strips exact legacy unscoped mock ids left over from old caches", () => {
      mockStorage.setItem(
        "hoard_notebook_courses_v3",
        JSON.stringify([makeMinimalCourse("agentic", "Agentic AI Demo"), makeMinimalCourse("real-course-1", "My Course")])
      );

      const result = getStoredCourses();

      expect(result.map((c) => c.id)).toEqual(["real-course-1"]);
    });

    it("keeps a real user course whose scoped id happens to end in the legacy mock suffix", () => {
      // A real course's raw slug can legitimately be "agentic" (e.g. user-created
      // or adopted-from-seed course later renamed). Once scoped per-user as
      // `${userId}_agentic`, it must not be treated as leftover mock seed data.
      mockStorage.setItem(
        "hoard_notebook_courses_v3",
        JSON.stringify([makeMinimalCourse("user123_agentic", "Agentic AI")])
      );

      const result = getStoredCourses();

      expect(result.map((c) => c.id)).toEqual(["user123_agentic"]);
    });
  });
});
