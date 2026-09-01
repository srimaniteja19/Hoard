import { describe, it, expect } from "vitest";
import {
  computeLessonBlocksUpdate,
  addLessonGapStub,
  createNewCourse,
  deleteLesson,
  clearLessonNotes,
  toggleLessonWatched,
  getStoredCourses,
  saveStoredCourses,
} from "./storage";
import { SEED_COURSES, SeedCourse } from "./seedData";
import { Block } from "./blocks";

describe("Notebooks Storage & In-Memory Logic", () => {
  it("updates lesson blocks in memory without mutating original unselected lessons", () => {
    const courses: SeedCourse[] = JSON.parse(JSON.stringify(SEED_COURSES));
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
});
