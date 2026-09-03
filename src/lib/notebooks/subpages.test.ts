import { describe, it, expect } from "vitest";
import {
  buildLessonTree,
  getLessonAncestors,
  getDirectChildLessons,
} from "./storage";
import { SeedCourseLesson } from "./seedData";
import { Block, convertBlocksToMarkdown } from "./blocks";

describe("Subpages Hierarchy and Tree Helpers", () => {
  const mockLessons: SeedCourseLesson[] = [
    {
      id: "root-1",
      title: "Root Page 1",
      watched: false,
      blocks: [],
    },
    {
      id: "sub-1",
      title: "Subpage 1.1",
      parentId: "root-1",
      watched: false,
      blocks: [],
    },
    {
      id: "sub-sub-1",
      title: "Nested Sub-Subpage 1.1.1",
      parentId: "sub-1",
      watched: false,
      blocks: [],
    },
    {
      id: "sub-2",
      title: "Subpage 1.2",
      parentId: "root-1",
      watched: false,
      blocks: [],
    },
    {
      id: "root-2",
      title: "Root Page 2",
      watched: false,
      blocks: [],
    },
  ];

  it("buildLessonTree builds a hierarchical tree of roots and children", () => {
    const tree = buildLessonTree(mockLessons);
    expect(tree).toHaveLength(2); // root-1 and root-2

    const root1 = tree[0];
    expect(root1.lesson.id).toBe("root-1");
    expect(root1.level).toBe(0);
    expect(root1.children).toHaveLength(2); // sub-1 and sub-2

    const sub1 = root1.children[0];
    expect(sub1.lesson.id).toBe("sub-1");
    expect(sub1.level).toBe(1);
    expect(sub1.children).toHaveLength(1); // sub-sub-1

    const subSub1 = sub1.children[0];
    expect(subSub1.lesson.id).toBe("sub-sub-1");
    expect(subSub1.level).toBe(2);
    expect(subSub1.children).toHaveLength(0);

    const root2 = tree[1];
    expect(root2.lesson.id).toBe("root-2");
    expect(root2.children).toHaveLength(0);
  });

  it("getLessonAncestors returns full breadcrumb path from root to current note", () => {
    const ancestors = getLessonAncestors(mockLessons, "sub-sub-1");
    expect(ancestors.map((a) => a.id)).toEqual(["root-1", "sub-1", "sub-sub-1"]);

    const rootAncestors = getLessonAncestors(mockLessons, "root-1");
    expect(rootAncestors.map((a) => a.id)).toEqual(["root-1"]);
  });

  it("getDirectChildLessons returns only immediate children", () => {
    const children = getDirectChildLessons(mockLessons, "root-1");
    expect(children.map((c) => c.id)).toEqual(["sub-1", "sub-2"]);

    const grandChildren = getDirectChildLessons(mockLessons, "sub-1");
    expect(grandChildren.map((c) => c.id)).toEqual(["sub-sub-1"]);

    const emptyChildren = getDirectChildLessons(mockLessons, "sub-sub-1");
    expect(emptyChildren).toEqual([]);
  });

  it("converts subpage block into readable markdown link card format", () => {
    const subpageBlock: Block = {
      id: "b-1",
      type: "subpage",
      pageId: "sub-1",
      title: "System Design Deep Dive",
      icon: "🏗️",
      wordCount: 1420,
    };

    const md = convertBlocksToMarkdown("Parent Note", [subpageBlock]);
    expect(md).toContain("# Parent Note");
    expect(md).toContain("🏗️ [System Design Deep Dive](#sub-1)");
  });
});
