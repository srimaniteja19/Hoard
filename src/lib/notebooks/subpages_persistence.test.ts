import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  isSameId,
  buildLessonTree,
  getLessonAncestors,
  getDirectChildLessons,
  deleteLesson,
  computeLessonBlocksUpdate,
  saveStoredCourses,
} from "./storage";
import { SeedCourse, SeedCourseLesson } from "./seedData";
import { Block } from "./blocks";

describe("Subpages Persistence and Hierarchy Resilience", () => {
  describe("isSameId", () => {
    it("matches identical IDs", () => {
      expect(isSameId("lesson-1", "lesson-1")).toBe(true);
      expect(isSameId("35a73f6c-9e8e-4484", "35a73f6c-9e8e-4484")).toBe(true);
    });

    it("matches IDs where one has a user-scoped prefix", () => {
      expect(isSameId("usr123_lesson-1", "lesson-1")).toBe(true);
      expect(isSameId("lesson-1", "usr123_lesson-1")).toBe(true);
      expect(isSameId("user_abc_uuid-xyz", "uuid-xyz")).toBe(true);
    });

    it("returns false for different IDs or null/undefined", () => {
      expect(isSameId("lesson-1", "lesson-2")).toBe(false);
      expect(isSameId("usr123_lesson-1", "usr123_lesson-2")).toBe(false);
      expect(isSameId(null, "lesson-1")).toBe(false);
      expect(isSameId("lesson-1", undefined)).toBe(false);
      expect(isSameId(null, undefined)).toBe(false);
    });
  });

  describe("buildLessonTree with mixed scoping and orphan safety", () => {
    it("correctly nests child subpages even if parent or child has scoped ID prefix", () => {
      const lessons: SeedCourseLesson[] = [
        {
          id: "usr123_root-1",
          title: "Root Lesson",
          watched: false,
          blocks: [],
        },
        {
          id: "subpage-1",
          title: "Child Subpage 1",
          parentId: "root-1", // unscoped parentId referencing scoped root
          watched: false,
          blocks: [],
        },
        {
          id: "usr123_subpage-2",
          title: "Nested Grandchild",
          parentId: "subpage-1", // child of subpage-1
          watched: false,
          blocks: [],
        },
      ];

      const tree = buildLessonTree(lessons);
      expect(tree).toHaveLength(1);
      expect(tree[0].lesson.id).toBe("usr123_root-1");
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children[0].lesson.id).toBe("subpage-1");
      expect(tree[0].children[0].children).toHaveLength(1);
      expect(tree[0].children[0].children[0].lesson.id).toBe("usr123_subpage-2");
    });

    it("promotes orphaned subpages whose parent is missing to root level so they are never lost", () => {
      const lessons: SeedCourseLesson[] = [
        {
          id: "sub-orphan-1",
          title: "Orphaned Subpage",
          parentId: "non-existent-parent",
          watched: false,
          blocks: [],
        },
        {
          id: "root-2",
          title: "Normal Root",
          watched: false,
          blocks: [],
        },
      ];

      const tree = buildLessonTree(lessons);
      expect(tree).toHaveLength(2);
      expect(tree.map((t) => t.lesson.id)).toContain("sub-orphan-1");
      expect(tree.map((t) => t.lesson.id)).toContain("root-2");
    });

    it("handles accidental circular parent references without infinite recursion", () => {
      const lessons: SeedCourseLesson[] = [
        {
          id: "page-a",
          title: "Page A",
          parentId: "page-b",
          watched: false,
          blocks: [],
        },
        {
          id: "page-b",
          title: "Page B",
          parentId: "page-a",
          watched: false,
          blocks: [],
        },
      ];

      // Should not throw or crash
      expect(() => buildLessonTree(lessons)).not.toThrow();
    });
  });

  describe("getLessonAncestors & getDirectChildLessons", () => {
    const lessons: SeedCourseLesson[] = [
      { id: "course_root", title: "Root", watched: false, blocks: [] },
      { id: "usr_child", title: "Child", parentId: "course_root", watched: false, blocks: [] },
      { id: "grandchild", title: "Grandchild", parentId: "usr_child", watched: false, blocks: [] },
    ];

    it("resolves full ancestry path with scoped/unscoped IDs", () => {
      const ancestors = getLessonAncestors(lessons, "grandchild");
      expect(ancestors.map((a) => a.id)).toEqual(["course_root", "usr_child", "grandchild"]);
    });

    it("returns direct children accurately with scoping resilience", () => {
      const children = getDirectChildLessons(lessons, "course_root");
      expect(children.map((c) => c.id)).toEqual(["usr_child"]);

      const grandChildren = getDirectChildLessons(lessons, "child"); // matching "usr_child"
      expect(grandChildren.map((c) => c.id)).toEqual(["grandchild"]);
    });
  });

  describe("deleteLesson cascade and block cleanup", () => {
    let mockStorage: {
      getItem: (key: string) => string | null;
      setItem: (key: string, value: string) => void;
      removeItem: (key: string) => void;
    };

    beforeEach(() => {
      const store = new Map<string, string>();
      mockStorage = {
        getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
      };
      vi.stubGlobal("window", {});
      vi.stubGlobal("localStorage", mockStorage);

      const initialCourses: SeedCourse[] = [
        {
          id: "c-1",
          title: "Course 1",
          provider: "TEST",
          accent: "#000",
          accentFg: "#fff",
          init: "C",
          startedAt: "2026-01-01",
          modules: [
            {
              id: "m-1",
              title: "Module 1",
              lessons: [
                {
                  id: "parent-note",
                  title: "Parent Note",
                  watched: false,
                  blocks: [
                    {
                      id: "b-1",
                      type: "subpage",
                      pageId: "sub-1",
                      title: "Subpage 1",
                      icon: "📄",
                      wordCount: 0,
                    },
                    {
                      id: "b-2",
                      type: "paragraph",
                      text: "Keep this paragraph",
                    },
                  ],
                },
                {
                  id: "sub-1",
                  title: "Subpage 1",
                  parentId: "parent-note",
                  watched: false,
                  blocks: [
                    {
                      id: "b-3",
                      type: "subpage",
                      pageId: "sub-sub-1",
                      title: "Deep Subpage",
                    },
                  ],
                },
                {
                  id: "sub-sub-1",
                  title: "Deep Subpage",
                  parentId: "sub-1",
                  watched: false,
                  blocks: [],
                },
                {
                  id: "unrelated-note",
                  title: "Unrelated Note",
                  watched: false,
                  blocks: [],
                },
              ],
            },
          ],
        },
      ];
      saveStoredCourses(initialCourses);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("deleting a subpage removes it and cleans up the parent note subpage block", () => {
      const updated = deleteLesson("c-1", "sub-1");
      const mod = updated[0].modules[0];

      // sub-1 and its child sub-sub-1 should be cascade deleted
      expect(mod.lessons.map((l) => l.id)).toEqual(["parent-note", "unrelated-note"]);

      // parent note should no longer have the subpage block
      const parent = mod.lessons.find((l) => l.id === "parent-note");
      expect(parent?.blocks).toHaveLength(1);
      expect(parent?.blocks?.[0].type).toBe("paragraph");
    });
  });

  describe("computeLessonBlocksUpdate", () => {
    it("updates lesson blocks reliably even when courseId is scoped", () => {
      const courses: SeedCourse[] = [
        {
          id: "user123_course-1",
          title: "Course 1",
          provider: "TEST",
          accent: "#000",
          accentFg: "#fff",
          init: "C",
          startedAt: "2026-01-01",
          modules: [
            {
              id: "m-1",
              title: "Module 1",
              lessons: [
                {
                  id: "sub-note-1",
                  title: "Subnote",
                  parentId: "parent-1",
                  watched: false,
                  blocks: [],
                },
              ],
            },
          ],
        },
      ];

      const newBlocks: Block[] = [{ id: "new-p", type: "paragraph", text: "Saved note text" }];
      // Calling with unscoped course-1 and scoped user123_course-1
      const res = computeLessonBlocksUpdate(courses, "course-1", "sub-note-1", newBlocks);
      expect(res[0]?.modules[0]?.lessons[0]?.blocks).toHaveLength(1);
      expect(res[0]?.modules[0]?.lessons[0]?.blocks?.[0].type).toBe("paragraph");
    });
  });
});
